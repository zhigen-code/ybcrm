import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { HTTPException } from 'hono/http-exception'

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
        'https://crm-web-6sc.pages.dev',
        'http://localhost:5173',
      ]
      if (allowed.includes(origin)) return origin
      // 允许 Pages 预览部署的子域名
      if (origin?.endsWith('.crm-web-6sc.pages.dev')) return origin
      return null
    },
    credentials: true,
  }),
)

// 公开选项接口（无需登录）
app.route('/api/options', optionsRoutes)

// 公开接口（无需登录）
app.get('/api/public/settings', async (c) => {
  const result = await c.env.DB.prepare(
    "SELECT value FROM system_settings WHERE key = 'system_name'",
  ).first<{ value: string }>()
  return c.json({ data: { systemName: result?.value ?? '辅助生殖 CRM' } })
})

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
