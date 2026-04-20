import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { HTTPException } from 'hono/http-exception'
import { v4 as uuidv4 } from 'uuid'
import { requireAuth, requireAdmin, requireNotSales } from '../middleware/auth'
import { toCamel, toCamelList } from '../../shared/db'

export const partnersRoutes = new Hono<{ Bindings: Env }>()

partnersRoutes.use('*', requireAuth, requireNotSales)

partnersRoutes.get('/', async (c) => {
  const { page = '1', pageSize = '20', search } = c.req.query()
  const offset = (Number(page) - 1) * Number(pageSize)

  let where = 'WHERE deleted_at IS NULL'
  const params: unknown[] = []
  if (search) {
    where += ' AND (name LIKE ? OR contact_person LIKE ?)'
    const q = `%${search}%`
    params.push(q, q)
  }

  const [results, countResult] = await Promise.all([
    c.env.DB.prepare(`SELECT * FROM partners ${where} ORDER BY name LIMIT ? OFFSET ?`)
      .bind(...params, Number(pageSize), offset).all(),
    c.env.DB.prepare(`SELECT COUNT(*) as total FROM partners ${where}`)
      .bind(...params).first<{ total: number }>(),
  ])

  return c.json({
    data: toCamelList(results.results as Record<string, unknown>[]),
    total: countResult?.total ?? 0,
    page: Number(page),
    pageSize: Number(pageSize),
  })
})

partnersRoutes.get('/:id', async (c) => {
  const partner = await c.env.DB.prepare('SELECT * FROM partners WHERE id = ? AND deleted_at IS NULL')
    .bind(c.req.param('id'))
    .first()
  if (!partner) throw new HTTPException(404, { message: '合作伙伴不存在' })
  return c.json({ data: toCamel(partner as Record<string, unknown>) })
})

const partnerSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1, '请选择类型'),
  contactPerson: z.string().nullable().optional(),
  contactInfo: z.string().nullable().optional(),
  serviceScope: z.array(z.string()).optional(),
  apiConfig: z.record(z.unknown()).nullable().optional(),
})

partnersRoutes.post('/', requireAdmin, zValidator('json', partnerSchema), async (c) => {
  const body = c.req.valid('json')

  // 动态验证 type 是否在 option_items 中
  const validType = await c.env.DB.prepare(
    "SELECT id FROM option_items WHERE group_key = 'partner_type' AND value = ? AND is_active = 1",
  ).bind(body.type).first()
  if (!validType) {
    return c.json({ message: '无效的合作伙伴类型' }, 400)
  }

  const id = uuidv4()
  await c.env.DB.prepare(
    'INSERT INTO partners (id, name, type, contact_person, contact_info, service_scope, api_config) VALUES (?, ?, ?, ?, ?, ?, ?)',
  )
    .bind(
      id, body.name, body.type,
      body.contactPerson ?? null, body.contactInfo ?? null,
      JSON.stringify(body.serviceScope ?? []),
      body.apiConfig ? JSON.stringify(body.apiConfig) : null,
    )
    .run()
  const partner = await c.env.DB.prepare('SELECT * FROM partners WHERE id = ?').bind(id).first()
  return c.json({ data: toCamel(partner as Record<string, unknown>) }, 201)
})

partnersRoutes.put('/:id', requireAdmin, zValidator('json', partnerSchema.partial()), async (c) => {
  const id = c.req.param('id')
  const body = c.req.valid('json')

  const existing = await c.env.DB.prepare('SELECT id FROM partners WHERE id = ?').bind(id).first()
  if (!existing) throw new HTTPException(404, { message: '合作伙伴不存在' })

  const updates: string[] = ['updated_at = CURRENT_TIMESTAMP']
  const params: unknown[] = []

  if (body.name !== undefined) { updates.push('name = ?'); params.push(body.name) }
  if (body.type !== undefined) { updates.push('type = ?'); params.push(body.type) }
  if (body.contactPerson !== undefined) { updates.push('contact_person = ?'); params.push(body.contactPerson) }
  if (body.contactInfo !== undefined) { updates.push('contact_info = ?'); params.push(body.contactInfo) }
  if (body.serviceScope !== undefined) { updates.push('service_scope = ?'); params.push(JSON.stringify(body.serviceScope)) }
  if (body.apiConfig !== undefined) { updates.push('api_config = ?'); params.push(body.apiConfig ? JSON.stringify(body.apiConfig) : null) }

  params.push(id)
  await c.env.DB.prepare(`UPDATE partners SET ${updates.join(', ')} WHERE id = ?`).bind(...params).run()
  const updated = await c.env.DB.prepare('SELECT * FROM partners WHERE id = ?').bind(id).first()
  return c.json({ data: toCamel(updated as Record<string, unknown>) })
})

partnersRoutes.delete('/:id', requireAdmin, async (c) => {
  const id = c.req.param('id')
  const existing = await c.env.DB.prepare('SELECT id FROM partners WHERE id = ? AND deleted_at IS NULL').bind(id).first()
  if (!existing) throw new HTTPException(404, { message: '合作伙伴不存在' })
  await c.env.DB.prepare('UPDATE partners SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?').bind(id).run()
  return c.json({ data: { id } })
})
