import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { HTTPException } from 'hono/http-exception'
import bcrypt from 'bcryptjs'
import { requireAuth, requireAdmin } from '../middleware/auth'
import { toCamel, toCamelList } from '../../shared/db'

export const usersRoutes = new Hono<{ Bindings: Env }>()

usersRoutes.use('*', requireAuth, requireAdmin)

usersRoutes.get('/', async (c) => {
  const results = await c.env.DB.prepare(
    'SELECT id, email, name, role, team_id, capacity, specialization, current_leads_count, created_at FROM users ORDER BY name',
  ).all()
  const users = (results.results as Record<string, unknown>[]).map((u) => {
    const camel = toCamel(u) as Record<string, unknown>
    if (typeof camel.specialization === 'string') {
      try { camel.specialization = JSON.parse(camel.specialization as string) } catch { camel.specialization = [] }
    }
    camel.specialization ??= []
    return camel
  })
  return c.json({ data: users })
})

usersRoutes.put(
  '/:id',
  zValidator(
    'json',
    z.object({
      name: z.string().optional(),
      role: z.enum(['admin', 'operations', 'sales']).optional(),
      teamId: z.string().nullable().optional(),
      capacity: z.number().int().positive().optional(),
      specialization: z.array(z.string()).optional(),
    }),
  ),
  async (c) => {
    const id = c.req.param('id')
    const body = c.req.valid('json')

    const existing = await c.env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(id).first()
    if (!existing) throw new HTTPException(404, { message: '用户不存在' })

    const updates: string[] = ['updated_at = CURRENT_TIMESTAMP']
    const params: unknown[] = []

    if (body.name !== undefined) { updates.push('name = ?'); params.push(body.name) }
    if (body.role !== undefined) { updates.push('role = ?'); params.push(body.role) }
    if (body.teamId !== undefined) { updates.push('team_id = ?'); params.push(body.teamId) }
    if (body.capacity !== undefined) { updates.push('capacity = ?'); params.push(body.capacity) }
    if (body.specialization !== undefined) { updates.push('specialization = ?'); params.push(JSON.stringify(body.specialization)) }

    params.push(id)
    await c.env.DB.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).bind(...params).run()

    const updated = await c.env.DB.prepare(
      'SELECT id, email, name, role, team_id, capacity, current_leads_count FROM users WHERE id = ?',
    ).bind(id).first()
    return c.json({ data: toCamel(updated as Record<string, unknown>) })
  },
)

// 管理员重置指定用户密码（无需旧密码）
usersRoutes.put(
  '/:id/password',
  zValidator('json', z.object({ newPassword: z.string().min(8, '密码至少 8 位') })),
  async (c) => {
    const id = c.req.param('id')
    const { newPassword } = c.req.valid('json')

    const existing = await c.env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(id).first()
    if (!existing) throw new HTTPException(404, { message: '用户不存在' })

    const passwordHash = await bcrypt.hash(newPassword, 12)
    await c.env.DB.prepare(
      'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    ).bind(passwordHash, id).run()

    return c.json({ data: { success: true } })
  },
)
