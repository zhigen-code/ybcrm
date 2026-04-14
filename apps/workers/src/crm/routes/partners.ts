import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { HTTPException } from 'hono/http-exception'
import { v4 as uuidv4 } from 'uuid'
import { requireAuth, requireAdmin } from '../middleware/auth'
import { toCamel, toCamelList } from '../../shared/db'

export const partnersRoutes = new Hono<{ Bindings: Env }>()

partnersRoutes.use('*', requireAuth)

partnersRoutes.get('/', async (c) => {
  const results = await c.env.DB.prepare('SELECT * FROM partners ORDER BY name').all()
  return c.json({ data: toCamelList(results.results as Record<string, unknown>[]) })
})

partnersRoutes.get('/:id', async (c) => {
  const partner = await c.env.DB.prepare('SELECT * FROM partners WHERE id = ?')
    .bind(c.req.param('id'))
    .first()
  if (!partner) throw new HTTPException(404, { message: '合作伙伴不存在' })
  return c.json({ data: toCamel(partner as Record<string, unknown>) })
})

const partnerSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['FertilityCenter', 'SurrogacyAgency', 'EggDonationAgency']),
  contactPerson: z.string().nullable().optional(),
  contactInfo: z.string().nullable().optional(),
  serviceScope: z.array(z.string()).optional(),
  apiConfig: z.record(z.unknown()).nullable().optional(),
})

partnersRoutes.post('/', requireAdmin, zValidator('json', partnerSchema), async (c) => {
  const body = c.req.valid('json')
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
