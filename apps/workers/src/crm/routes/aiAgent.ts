import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { HTTPException } from 'hono/http-exception'
import { requireAuth } from '../middleware/auth'
import { CRM_TOOLS } from '../agent/tools'
import { executeTool, AgentContext } from '../agent/executor'

export const aiAgentRoutes = new Hono<{ Bindings: Env }>()

aiAgentRoutes.use('*', requireAuth)

// 消息结构（与 Anthropic Messages API 对齐）
const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.union([
    z.string(),
    z.array(z.record(z.unknown())),
  ]),
})

const SYSTEM_PROMPT = `你是一个 CRM 智能助手，帮助用户管理线索和客户。

你的能力：
- 查询、筛选线索和客户（支持按状态、下次联系时间、姓名等）
- 为线索/客户创建跟进记录（电话、会面、备注等）
- 安排下次联系时间
- 更新线索状态、客户合同状态
- 分配负责人
- 查询待跟进、已逾期的线索/客户

操作规范：
1. 执行状态变更前，先用 get_options 确认有效值
2. 对单个实体操作前，先用 get_lead/get_client 了解当前状态
3. 所有重要操作配合 create_activity 留下记录
4. 查询到多条结果时，简洁列出关键字段（姓名、状态、下次联系时间），不要堆砌所有字段
5. 不确定用户意图时主动询问，不要假设

日期参考：今天是 ${new Date().toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' })}

回复语言：中文，简洁直接。`

// POST /api/ai-agent/chat
aiAgentRoutes.post(
  '/ai-agent/chat',
  zValidator('json', z.object({
    messages: z.array(messageSchema).min(1).max(50),
  })),
  async (c) => {
    const { messages } = c.req.valid('json')
    const { userId, role } = c.get('jwtPayload')

    // 获取 AI 模型配置
    const modelRow = await c.env.DB.prepare(`
      SELECT m.model_id, m.display_name, p.provider_type, p.api_key, p.base_url
      FROM ai_models m JOIN ai_providers p ON m.provider_id = p.id
      WHERE m.is_enabled = 1 AND p.is_active = 1
      ORDER BY m.created_at ASC LIMIT 1
    `).first<{ model_id: string; display_name: string; provider_type: string; api_key: string; base_url: string | null }>()

    if (!modelRow) throw new HTTPException(400, { message: '未配置可用的 AI 模型' })
    if (modelRow.provider_type !== 'anthropic') {
      throw new HTTPException(400, { message: 'AI Agent 需要使用 Anthropic 模型（支持 tool use）' })
    }

    const agentCtx: AgentContext = { db: c.env.DB, userId, role }

    // 多轮 tool-use 循环（最多 10 轮防止死循环）
    const msgList: unknown[] = [...messages]
    let finalText = ''

    for (let round = 0; round < 10; round++) {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': modelRow.api_key,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: modelRow.model_id,
          max_tokens: 2048,
          system: SYSTEM_PROMPT,
          tools: CRM_TOOLS,
          messages: msgList,
        }),
      })

      if (!res.ok) {
        const text = await res.text()
        throw new HTTPException(502, { message: `AI 调用失败：${text.slice(0, 200)}` })
      }

      const json = await res.json() as {
        stop_reason: string
        content: Array<
          | { type: 'text'; text: string }
          | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
        >
      }

      // 把 assistant 回复加入消息历史
      msgList.push({ role: 'assistant', content: json.content })

      if (json.stop_reason === 'end_turn') {
        // 纯文字回复，结束循环
        finalText = json.content.filter((b) => b.type === 'text').map((b) => (b as { type: 'text'; text: string }).text).join('')
        break
      }

      if (json.stop_reason === 'tool_use') {
        // 执行所有工具调用
        const toolUseBlocks = json.content.filter((b) => b.type === 'tool_use') as Array<{ type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }>

        const toolResults = await Promise.all(
          toolUseBlocks.map(async (block) => {
            let result: unknown
            try {
              result = await executeTool(agentCtx, block.name, block.input)
            } catch (err) {
              result = { error: `工具执行异常：${err instanceof Error ? err.message : String(err)}` }
            }
            return {
              type: 'tool_result',
              tool_use_id: block.id,
              content: JSON.stringify(result),
            }
          }),
        )

        msgList.push({ role: 'user', content: toolResults })
        continue
      }

      // 其他 stop_reason（如 max_tokens）直接取文字内容返回
      finalText = json.content.filter((b) => b.type === 'text').map((b) => (b as { type: 'text'; text: string }).text).join('')
      break
    }

    return c.json({ data: { message: finalText, model: modelRow.display_name } })
  },
)
