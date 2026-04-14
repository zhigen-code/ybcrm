import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { HTTPException } from 'hono/http-exception'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import { signCrmJwt } from '../../shared/jwt'
import { requireAuth, requireAdmin } from '../middleware/auth'

export const authRoutes = new Hono<{ Bindings: Env }>()

authRoutes.post(
  '/login',
  zValidator('json', z.object({ email: z.string().email(), password: z.string().min(1) })),
  async (c) => {
    const { email, password } = c.req.valid('json')

    const user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first<{
      id: string; email: string; password_hash: string; name: string; role: string; team_id: string | null
    }>()

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      throw new HTTPException(401, { message: '邮箱或密码错误' })
    }

    const token = await signCrmJwt(
      { userId: user.id, role: user.role as 'admin' | 'operations' | 'sales', teamId: user.team_id },
      c.env.JWT_SECRET,
    )

    return c.json({ data: { token, user: { id: user.id, email: user.email, name: user.name, role: user.role, teamId: user.team_id } } })
  },
)

authRoutes.get('/me', requireAuth, async (c) => {
  const { userId } = c.get('jwtPayload')
  const user = await c.env.DB.prepare(
    'SELECT id, email, name, role, team_id, capacity, specialization, current_leads_count, created_at FROM users WHERE id = ?',
  ).bind(userId).first()
  if (!user) throw new HTTPException(404, { message: '用户不存在' })
  return c.json({ data: user })
})

authRoutes.put(
  '/profile',
  requireAuth,
  zValidator(
    'json',
    z.object({
      name: z.string().min(1).optional(),
      currentPassword: z.string().optional(),
      newPassword: z.string().min(8).optional(),
    }),
  ),
  async (c) => {
    const { userId } = c.get('jwtPayload')
    const body = c.req.valid('json')

    const user = await c.env.DB.prepare('SELECT id, password_hash FROM users WHERE id = ?')
      .bind(userId)
      .first<{ id: string; password_hash: string }>()
    if (!user) throw new HTTPException(404, { message: '用户不存在' })

    const updates: string[] = ['updated_at = CURRENT_TIMESTAMP']
    const params: unknown[] = []

    if (body.name !== undefined) {
      updates.push('name = ?')
      params.push(body.name)
    }

    if (body.newPassword !== undefined) {
      if (!body.currentPassword) {
        throw new HTTPException(400, { message: '请输入当前密码' })
      }
      const valid = await bcrypt.compare(body.currentPassword, user.password_hash)
      if (!valid) throw new HTTPException(400, { message: '当前密码错误' })
      updates.push('password_hash = ?')
      params.push(await bcrypt.hash(body.newPassword, 12))
    }

    if (params.length === 0) return c.json({ data: { success: true } })

    params.push(userId)
    await c.env.DB.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...params)
      .run()

    const updated = await c.env.DB.prepare(
      'SELECT id, email, name, role, team_id FROM users WHERE id = ?',
    ).bind(userId).first()
    return c.json({ data: updated })
  },
)

authRoutes.post(
  '/register',
  requireAuth,
  requireAdmin,
  zValidator('json', z.object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string().min(1),
    role: z.enum(['admin', 'operations', 'sales']),
    teamId: z.string().nullable().optional(),
  })),
  async (c) => {
    const { email, password, name, role, teamId } = c.req.valid('json')
    const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first()
    if (existing) throw new HTTPException(409, { message: '邮箱已存在' })

    const passwordHash = await bcrypt.hash(password, 12)
    const id = uuidv4()
    await c.env.DB.prepare(
      'INSERT INTO users (id, email, password_hash, name, role, team_id) VALUES (?, ?, ?, ?, ?, ?)',
    ).bind(id, email, passwordHash, name, role, teamId ?? null).run()

    return c.json({ data: { id, email, name, role } }, 201)
  },
)
