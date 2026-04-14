import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { HTTPException } from 'hono/http-exception'
import { v4 as uuidv4 } from 'uuid'
import { requireAuth, requireAdmin } from '../middleware/auth'
import { toCamel, toCamelList } from '../../shared/db'

export const servicesRoutes = new Hono<{ Bindings: Env }>()

servicesRoutes.use('*', requireAuth)

servicesRoutes.get('/', async (c) => {
  const results = await c.env.DB.prepare('SELECT * FROM services ORDER BY name').all()
  return c.json({ data: toCamelList(results.results as Record<string, unknown>[]) })
})

servicesRoutes.get('/:id', async (c) => {
  const service = await c.env.DB.prepare('SELECT * FROM services WHERE id = ?')
    .bind(c.req.param('id'))
    .first()
  if (!service) throw new HTTPException(404, { message: '服务不存在' })
  return c.json({ data: toCamel(service as Record<string, unknown>) })
})

const serviceSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  price: z.number().nullable().optional(),
  processSteps: z.array(z.string()).optional(),
})

servicesRoutes.post('/', requireAdmin, zValidator('json', serviceSchema), async (c) => {
  const body = c.req.valid('json')
  const id = uuidv4()
  await c.env.DB.prepare(
    'INSERT INTO services (id, name, description, price, process_steps) VALUES (?, ?, ?, ?, ?)',
  )
    .bind(id, body.name, body.description ?? null, body.price ?? null, JSON.stringify(body.processSteps ?? []))
    .run()
  const service = await c.env.DB.prepare('SELECT * FROM services WHERE id = ?').bind(id).first()
  return c.json({ data: toCamel(service as Record<string, unknown>) }, 201)
})

servicesRoutes.put('/:id', requireAdmin, zValidator('json', serviceSchema.partial()), async (c) => {
  const id = c.req.param('id')
  const body = c.req.valid('json')

  const existing = await c.env.DB.prepare('SELECT id FROM services WHERE id = ?').bind(id).first()
  if (!existing) throw new HTTPException(404, { message: '服务不存在' })

  const updates: string[] = ['updated_at = CURRENT_TIMESTAMP']
  const params: unknown[] = []

  if (body.name !== undefined) { updates.push('name = ?'); params.push(body.name) }
  if (body.description !== undefined) { updates.push('description = ?'); params.push(body.description) }
  if (body.price !== undefined) { updates.push('price = ?'); params.push(body.price) }
  if (body.processSteps !== undefined) { updates.push('process_steps = ?'); params.push(JSON.stringify(body.processSteps)) }

  params.push(id)
  await c.env.DB.prepare(`UPDATE services SET ${updates.join(', ')} WHERE id = ?`).bind(...params).run()
  const updated = await c.env.DB.prepare('SELECT * FROM services WHERE id = ?').bind(id).first()
  return c.json({ data: toCamel(updated as Record<string, unknown>) })
})
