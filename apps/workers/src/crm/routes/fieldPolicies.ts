import { Hono } from 'hono'
import { v4 as uuidv4 } from 'uuid'
import { requireAuth, requireAdmin } from '../middleware/auth'
import { toCamel } from '../../shared/db'

function parsePolicy(row: Record<string, unknown>) {
  const p = toCamel(row) as Record<string, unknown>
  if (typeof p.policyConfig === 'string') {
    try { p.policyConfig = JSON.parse(p.policyConfig as string) } catch { /* keep as-is */ }
  }
  return p
}

// ── 公开接口：/api/field-policies ────────────────────────────────────────────
export const fieldPoliciesRoutes = new Hono<{ Bindings: Env }>()

fieldPoliciesRoutes.get('/', async (c) => {
  const entityType = c.req.query('entityType')
  const sql = entityType
    ? 'SELECT * FROM field_policies WHERE is_active = 1 AND entity_type = ? ORDER BY trigger_value'
    : 'SELECT * FROM field_policies WHERE is_active = 1 ORDER BY entity_type, trigger_value'
  const rows = await c.env.DB.prepare(sql)
    .bind(...(entityType ? [entityType] : []))
    .all<Record<string, unknown>>()
  return c.json({ data: rows.results.map(parsePolicy) })
})

// ── Admin 接口：/api/admin/field-policies ────────────────────────────────────
export const fieldPoliciesAdminRoutes = new Hono<{ Bindings: Env }>()

fieldPoliciesAdminRoutes.use('*', requireAuth, requireAdmin)

// 查询全部（含禁用）
fieldPoliciesAdminRoutes.get('/', async (c) => {
  const rows = await c.env.DB.prepare(
    'SELECT * FROM field_policies ORDER BY entity_type, trigger_field, trigger_value',
  ).all<Record<string, unknown>>()
  return c.json({ data: rows.results.map(parsePolicy) })
})

// 新建
fieldPoliciesAdminRoutes.post('/', async (c) => {
  const body = await c.req.json<{
    entityType: string; triggerField: string; triggerValue: string; policyConfig: unknown
  }>()
  const id = uuidv4()
  await c.env.DB.prepare(
    'INSERT INTO field_policies (id, entity_type, trigger_field, trigger_value, policy_config) VALUES (?, ?, ?, ?, ?)',
  ).bind(id, body.entityType, body.triggerField, body.triggerValue, JSON.stringify(body.policyConfig)).run()
  return c.json({ data: { id } }, 201)
})

// 修改（启禁用）
fieldPoliciesAdminRoutes.put('/:id', async (c) => {
  const { id } = c.req.param()
  const body = await c.req.json<{ isActive?: boolean; policyConfig?: unknown }>()
  const updates: string[] = []
  const params: unknown[] = []
  if (body.isActive !== undefined) { updates.push('is_active = ?'); params.push(body.isActive ? 1 : 0) }
  if (body.policyConfig !== undefined) { updates.push('policy_config = ?'); params.push(JSON.stringify(body.policyConfig)) }
  if (!updates.length) return c.json({ message: '无可更新字段' }, 400)
  params.push(id)
  await c.env.DB.prepare(`UPDATE field_policies SET ${updates.join(', ')} WHERE id = ?`).bind(...params).run()
  return c.json({ data: { id } })
})

// 删除
fieldPoliciesAdminRoutes.delete('/:id', async (c) => {
  const { id } = c.req.param()
  await c.env.DB.prepare('DELETE FROM field_policies WHERE id = ?').bind(id).run()
  return c.json({ data: { id } })
})
