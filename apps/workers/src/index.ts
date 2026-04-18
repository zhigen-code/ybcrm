import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { HTTPException } from 'hono/http-exception'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'

// CRM 内部路由
import { authRoutes } from './crm/routes/auth'
import { leadsRoutes } from './crm/routes/leads'
import { clientsRoutes } from './crm/routes/clients'
import { servicesRoutes } from './crm/routes/services'
import { partnersRoutes } from './crm/routes/partners'
import { activitiesRoutes } from './crm/routes/activities'
import { usersRoutes } from './crm/routes/users'
import { teamsRoutes } from './crm/routes/teams'
import { uploadRoutes } from './crm/routes/upload'
import { settingsRoutes } from './crm/routes/settings'
import { optionsRoutes } from './crm/routes/options'
import { apiKeysRoutes } from './crm/routes/apiKeys'
import { assignmentRulesRoutes } from './crm/routes/assignmentRules'
import { aiConfigRoutes } from './crm/routes/aiConfig'
import { fieldPoliciesRoutes, fieldPoliciesAdminRoutes } from './crm/routes/fieldPolicies'
import { entitySchemaRoutes } from './crm/routes/entitySchema'
import { requireApiKey } from './crm/middleware/apiKeyAuth'

// 客户门户路由
import { portalAuthRoutes } from './portal/routes/auth'
import { profileRoutes } from './portal/routes/profile'
import { servicesRoutes as portalServicesRoutes } from './portal/routes/services'
import { resourcesRoutes } from './portal/routes/resources'

// 线索分配 Queue 消费逻辑
import { handleLeadAssignmentBatch } from './assignment/handler'

const app = new Hono<{ Bindings: Env }>()

app.use('*', logger())
app.use(
  '*',
  cors({
    origin: (origin) => {
      const allowed = [
        'https://youbei.zhigen.net',
        'https://crm.irfc.cn',
        'https://crm-web-6sc.pages.dev',
        'http://localhost:5173',
      ]
      if (allowed.includes(origin)) return origin
      // 允许 Cloudflare Pages 预览部署的子域名
      if (origin?.endsWith('.crm-web-6sc.pages.dev')) return origin
      // 允许阿里云 ESA Pages 预览子域名
      if (origin?.endsWith('.esapages.com')) return origin
      return null
    },
    credentials: true,
  }),
)

// 公开选项接口（无需登录）
app.route('/api/options', optionsRoutes)

// 公开接口（无需登录）
app.get('/api/public/settings', async (c) => {
  const rows = await c.env.DB.prepare(
    "SELECT key, value FROM system_settings WHERE key IN ('system_name', 'timezone')",
  ).all<{ key: string; value: string }>()
  const map = Object.fromEntries(rows.results.map((r) => [r.key, r.value]))
  return c.json({
    data: {
      systemName: map['system_name'] ?? '辅助生殖 CRM',
      timezone: map['timezone'] ?? 'Asia/Shanghai',
    },
  })
})

// 外部 API（API Key 鉴权，允许所有 origin）
app.use('/api/v1/*', cors({ origin: '*' }))

const v1LeadSchema = z.object({
  source: z.string().min(1, '请填写来源'),
  name: z.string().min(1, '请填写姓名'),
  contactInfo: z.string().min(1, '请填写联系方式'),
  intendedServices: z.array(z.string()).min(1, '请至少填写一个意向服务'),
  notes: z.string().nullable().optional(),
})

app.post(
  '/api/v1/leads',
  requireApiKey,
  zValidator('json', v1LeadSchema),
  async (c) => {
    const body = c.req.valid('json')
    const { userId } = c.get('jwtPayload')
    const id = uuidv4()
    await c.env.DB.prepare(
      `INSERT INTO leads (id, source, name, contact_info, intended_service, intended_services, status, notes, created_by_userId)
       VALUES (?, ?, ?, ?, ?, ?, 'New', ?, ?)`,
    ).bind(
      id, body.source, body.name, body.contactInfo,
      body.intendedServices[0], JSON.stringify(body.intendedServices),
      body.notes ?? null, userId,
    ).run()
    await c.env.LEAD_ASSIGNMENT_QUEUE.send({ leadId: id })
    return c.json({ data: { id, status: 'New' } }, 201)
  },
)

// CRM 内部 API（/api/*）
app.route('/api/auth', authRoutes)
app.route('/api/leads', leadsRoutes)
app.route('/api/clients', clientsRoutes)
app.route('/api/services', servicesRoutes)
app.route('/api/partners', partnersRoutes)
app.route('/api/activities', activitiesRoutes)
app.route('/api/users', usersRoutes)
app.route('/api/teams', teamsRoutes)
app.route('/api/upload', uploadRoutes)
app.route('/api/admin/settings', settingsRoutes)
app.route('/api/admin/options', optionsRoutes)
app.route('/api/admin/assignment-rules', assignmentRulesRoutes)
app.route('/api/admin/ai', aiConfigRoutes)
app.route('/api/auth/api-keys', apiKeysRoutes)
app.route('/api/field-policies', fieldPoliciesRoutes)
app.route('/api/admin/field-policies', fieldPoliciesAdminRoutes)
app.route('/api/admin/entity-schema', entitySchemaRoutes)

// 客户门户 API（/api/client/*）
app.route('/api/client/auth', portalAuthRoutes)
app.route('/api/client/profile', profileRoutes)
app.route('/api/client/services', portalServicesRoutes)
app.route('/api/client/resources', resourcesRoutes)

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ message: err.message }, err.status)
  }
  console.error(err)
  return c.json({ message: '服务器内部错误' }, 500)
})

app.notFound((c) => c.json({ message: '接口不存在' }, 404))

// 同时导出 fetch handler（HTTP 请求）和 queue handler（异步队列）
export default {
  fetch: app.fetch,
  async queue(batch: MessageBatch<{ leadId: string }>, env: Env): Promise<void> {
    await handleLeadAssignmentBatch(batch, env)
  },
}
