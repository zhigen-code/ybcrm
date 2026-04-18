import { Hono } from 'hono'
import { v4 as uuidv4 } from 'uuid'
import { requireAuth, requireAdmin } from '../middleware/auth'
import { toCamel } from '../../shared/db'

function parseTemplate(row: Record<string, unknown>) {
  const t = toCamel(row) as Record<string, unknown>
  if (typeof t.config === 'string') {
    try { t.config = JSON.parse(t.config as string) } catch { /* keep */ }
  }
  return t
}

export const actionTemplatesAdminRoutes = new Hono<{ Bindings: Env }>()
actionTemplatesAdminRoutes.use('*', requireAuth, requireAdmin)

// 查询全部
actionTemplatesAdminRoutes.get('/', async (c) => {
  const rows = await c.env.DB.prepare(
    'SELECT * FROM action_templates ORDER BY type, name',
  ).all<Record<string, unknown>>()
  return c.json({ data: rows.results.map(parseTemplate) })
})

// 新建
actionTemplatesAdminRoutes.post('/', async (c) => {
  const body = await c.req.json<{ name: string; type: string; config: unknown }>()
  const id = uuidv4()
  await c.env.DB.prepare(
    'INSERT INTO action_templates (id, name, type, config) VALUES (?, ?, ?, ?)',
  ).bind(id, body.name, body.type, JSON.stringify(body.config)).run()
  return c.json({ data: { id } }, 201)
})

// 修改
actionTemplatesAdminRoutes.put('/:id', async (c) => {
  const { id } = c.req.param()
  const body = await c.req.json<Partial<{ name: string; type: string; config: unknown; isActive: boolean }>>()
  const updates: string[] = ['updated_at = CURRENT_TIMESTAMP']
  const params: unknown[] = []
  if (body.name     !== undefined) { updates.push('name = ?');      params.push(body.name) }
  if (body.type     !== undefined) { updates.push('type = ?');      params.push(body.type) }
  if (body.config   !== undefined) { updates.push('config = ?');    params.push(JSON.stringify(body.config)) }
  if (body.isActive !== undefined) { updates.push('is_active = ?'); params.push(body.isActive ? 1 : 0) }
  if (params.length === 0) return c.json({ message: '无可更新字段' }, 400)
  params.push(id)
  await c.env.DB.prepare(`UPDATE action_templates SET ${updates.join(', ')} WHERE id = ?`).bind(...params).run()
  return c.json({ data: { id } })
})

// 删除
actionTemplatesAdminRoutes.delete('/:id', async (c) => {
  const { id } = c.req.param()
  await c.env.DB.prepare('DELETE FROM action_templates WHERE id = ?').bind(id).run()
  return c.json({ data: { id } })
})
