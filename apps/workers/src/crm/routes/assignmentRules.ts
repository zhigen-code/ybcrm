import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { requireAuth, requireAdmin } from '../middleware/auth'
import { toCamelList, toCamel } from '../../shared/db'

export const assignmentRulesRoutes = new Hono<{ Bindings: Env }>()

assignmentRulesRoutes.use('*', requireAuth, requireAdmin)

const RULE_TYPE_LABELS: Record<string, string> = {
  round_robin:  '轮询分配',
  load_balance: '负载均衡',
  skill_match:  '专长匹配',
  region_match: '区域匹配',
}

// GET /api/admin/assignment-rules
assignmentRulesRoutes.get('/', async (c) => {
  const results = await c.env.DB.prepare(
    'SELECT * FROM assignment_rules ORDER BY priority ASC',
  ).all()
  const rules = (toCamelList(results.results as Record<string, unknown>[]) as Record<string, unknown>[]).map((r) => ({
    ...r,
    ruleTypeLabel: RULE_TYPE_LABELS[r.ruleType as string] ?? r.ruleType,
  }))
  return c.json({ data: rules })
})

// PUT /api/admin/assignment-rules/:id
assignmentRulesRoutes.put(
  '/:id',
  zValidator(
    'json',
    z.object({
      isActive: z.boolean().optional(),
      priority: z.number().int().min(0).optional(),
    }),
  ),
  async (c) => {
    const id = c.req.param('id')
    const body = c.req.valid('json')

    const updates: string[] = []
    const params: unknown[] = []
    if (body.isActive !== undefined) { updates.push('is_active = ?'); params.push(body.isActive ? 1 : 0) }
    if (body.priority !== undefined) { updates.push('priority = ?'); params.push(body.priority) }

    if (updates.length === 0) return c.json({ message: '无可更新字段' }, 400)

    params.push(id)
    await c.env.DB.prepare(`UPDATE assignment_rules SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...params).run()

    const updated = await c.env.DB.prepare('SELECT * FROM assignment_rules WHERE id = ?').bind(id).first()
    const rule = toCamel(updated as Record<string, unknown>) as Record<string, unknown>
    return c.json({ data: { ...rule, ruleTypeLabel: RULE_TYPE_LABELS[rule.ruleType as string] ?? rule.ruleType } })
  },
)
