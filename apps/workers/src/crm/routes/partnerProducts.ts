import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { requireAuth, requireNotSales } from '../middleware/auth'
import { toCamel, toCamelList } from '../../shared/db'

export const partnerProductsRoutes = new Hono<{ Bindings: Env }>()

partnerProductsRoutes.use('*', requireAuth, requireNotSales)

const SELECT = `
  SELECT pp.*, p.name as partner_name, s.name as service_name
  FROM partner_products pp
  JOIN partners p ON pp.partner_id = p.id
  JOIN services s ON pp.service_id = s.id`

// GET /partner-products?partnerId=&serviceId=&active=
partnerProductsRoutes.get('/', async (c) => {
  const { partnerId, serviceId, active } = c.req.query()

  let where = 'WHERE 1=1'
  const params: unknown[] = []

  if (partnerId) { where += ' AND pp.partner_id = ?'; params.push(partnerId) }
  if (serviceId) { where += ' AND pp.service_id = ?'; params.push(serviceId) }
  if (active === 'true') { where += ' AND pp.is_active = 1' }

  const rows = await c.env.DB.prepare(
    `${SELECT} ${where} ORDER BY pp.sort_order ASC, pp.created_at ASC`,
  ).bind(...params).all()

  return c.json({ data: toCamelList(rows.results as Record<string, unknown>[]) })
})

// POST /partner-products
partnerProductsRoutes.post(
  '/',
  zValidator('json', z.object({
    partnerId: z.string().min(1),
    serviceId: z.string().min(1),
    name: z.string().min(1),
    description: z.string().nullable().optional(),
    price: z.number().nullable().optional(),
    currency: z.string().default('USD'),
  })),
  async (c) => {
    const body = c.req.valid('json')
    const id = uuidv4()
    await c.env.DB.prepare(
      `INSERT INTO partner_products (id, partner_id, service_id, name, description, price, currency)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).bind(id, body.partnerId, body.serviceId, body.name, body.description ?? null, body.price ?? null, body.currency).run()

    const row = await c.env.DB.prepare(`${SELECT} WHERE pp.id = ?`).bind(id).first()
    return c.json({ data: toCamel(row as Record<string, unknown>) }, 201)
  },
)

// PUT /partner-products/:id
partnerProductsRoutes.put(
  '/:id',
  zValidator('json', z.object({
    name: z.string().min(1).optional(),
    description: z.string().nullable().optional(),
    price: z.number().nullable().optional(),
    currency: z.string().optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().optional(),
  })),
  async (c) => {
    const id = c.req.param('id')
    const body = c.req.valid('json')
    const updates: string[] = []
    const params: unknown[] = []

    if (body.name !== undefined) { updates.push('name = ?'); params.push(body.name) }
    if (body.description !== undefined) { updates.push('description = ?'); params.push(body.description) }
    if (body.price !== undefined) { updates.push('price = ?'); params.push(body.price) }
    if (body.currency !== undefined) { updates.push('currency = ?'); params.push(body.currency) }
    if (body.isActive !== undefined) { updates.push('is_active = ?'); params.push(body.isActive ? 1 : 0) }
    if (body.sortOrder !== undefined) { updates.push('sort_order = ?'); params.push(body.sortOrder) }

    if (updates.length === 0) return c.json({ message: '无更新内容' }, 400)
    params.push(id)
    await c.env.DB.prepare(`UPDATE partner_products SET ${updates.join(', ')} WHERE id = ?`).bind(...params).run()

    const row = await c.env.DB.prepare(`${SELECT} WHERE pp.id = ?`).bind(id).first()
    return c.json({ data: toCamel(row as Record<string, unknown>) })
  },
)

// DELETE /partner-products/:id
partnerProductsRoutes.delete('/:id', async (c) => {
  const id = c.req.param('id')
  // 删除 entity_attachments
  const atts = await c.env.DB.prepare(
    "SELECT file_key FROM entity_attachments WHERE entity_type = 'product' AND entity_id = ?",
  ).bind(id).all()
  for (const att of atts.results as { file_key: string }[]) {
    await c.env.STORAGE.delete(att.file_key)
  }
  await c.env.DB.prepare("DELETE FROM entity_attachments WHERE entity_type = 'product' AND entity_id = ?").bind(id).run()
  await c.env.DB.prepare('DELETE FROM partner_products WHERE id = ?').bind(id).run()
  return c.json({ data: { success: true } })
})
