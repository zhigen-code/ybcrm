import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { requireAuth, requireAdmin } from '../middleware/auth'
import { toCamel, toCamelList } from '../../shared/db'

export const teamsRoutes = new Hono<{ Bindings: Env }>()

teamsRoutes.use('*', requireAuth)

teamsRoutes.get('/', async (c) => {
  const results = await c.env.DB.prepare('SELECT * FROM teams ORDER BY name').all()
  return c.json({ data: toCamelList(results.results as Record<string, unknown>[]) })
})

teamsRoutes.post(
  '/',
  requireAdmin,
  zValidator('json', z.object({ name: z.string().min(1), region: z.string().nullable().optional() })),
  async (c) => {
    const { name, region } = c.req.valid('json')
    const id = uuidv4()
    await c.env.DB.prepare('INSERT INTO teams (id, name, region) VALUES (?, ?, ?)')
      .bind(id, name, region ?? null)
      .run()
    const team = await c.env.DB.prepare('SELECT * FROM teams WHERE id = ?').bind(id).first()
    return c.json({ data: toCamel(team as Record<string, unknown>) }, 201)
  },
)

teamsRoutes.put(
  '/:id',
  requireAdmin,
  zValidator('json', z.object({ name: z.string().optional(), region: z.string().nullable().optional() })),
  async (c) => {
    const id = c.req.param('id')
    const body = c.req.valid('json')

    const updates: string[] = ['updated_at = CURRENT_TIMESTAMP']
    const params: unknown[] = []
    if (body.name !== undefined) { updates.push('name = ?'); params.push(body.name) }
    if (body.region !== undefined) { updates.push('region = ?'); params.push(body.region) }

    params.push(id)
    await c.env.DB.prepare(`UPDATE teams SET ${updates.join(', ')} WHERE id = ?`).bind(...params).run()
    const updated = await c.env.DB.prepare('SELECT * FROM teams WHERE id = ?').bind(id).first()
    return c.json({ data: toCamel(updated as Record<string, unknown>) })
  },
)

teamsRoutes.delete('/:id', requireAdmin, async (c) => {
  const id = c.req.param('id')
  // 解除成员关联后再删除
  await c.env.DB.prepare('UPDATE users SET team_id = NULL WHERE team_id = ?').bind(id).run()
  await c.env.DB.prepare('DELETE FROM teams WHERE id = ?').bind(id).run()
  return c.json({ data: { success: true } })
})
