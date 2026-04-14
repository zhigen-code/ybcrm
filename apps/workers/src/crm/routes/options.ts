import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { HTTPException } from 'hono/http-exception'
import { v4 as uuidv4 } from 'uuid'
import { requireAuth, requireAdmin } from '../middleware/auth'
import { toCamel, toCamelList } from '../../shared/db'

export const optionsRoutes = new Hono<{ Bindings: Env }>()

const VALID_COLORS = ['gray', 'blue', 'green', 'yellow', 'red', 'purple'] as const

// GET /api/options — 公开，按 group_key 分组返回所有启用选项
optionsRoutes.get('/', async (c) => {
  const results = await c.env.DB.prepare(
    'SELECT * FROM option_items WHERE is_active = 1 ORDER BY group_key, sort_order',
  ).all()

  const grouped: Record<string, unknown[]> = {}
  for (const row of results.results as Record<string, unknown>[]) {
    const gk = row.group_key as string
    if (!grouped[gk]) grouped[gk] = []
    grouped[gk].push(toCamel(row))
  }
  return c.json({ data: grouped })
})

// 以下路由需要 admin 权限
optionsRoutes.use('/items*', requireAuth, requireAdmin)

// GET /api/admin/options/items?groupKey=xxx — 管理端，返回全部（含禁用）
optionsRoutes.get('/items', async (c) => {
  const { groupKey } = c.req.query()
  const sql = groupKey
    ? 'SELECT * FROM option_items WHERE group_key = ? ORDER BY sort_order'
    : 'SELECT * FROM option_items ORDER BY group_key, sort_order'
  const results = groupKey
    ? await c.env.DB.prepare(sql).bind(groupKey).all()
    : await c.env.DB.prepare(sql).all()
  return c.json({ data: toCamelList(results.results as Record<string, unknown>[]) })
})

// POST /api/admin/options/items — 新增选项
optionsRoutes.post(
  '/items',
  zValidator(
    'json',
    z.object({
      groupKey:  z.enum(['lead_status', 'contract_status', 'activity_type', 'partner_type']),
      value:     z.string().min(1, '请填写值'),
      label:     z.string().min(1, '请填写标签'),
      color:     z.enum(VALID_COLORS).default('gray'),
      sortOrder: z.number().int().default(0),
    }),
  ),
  async (c) => {
    const body = c.req.valid('json')

    // lead_status 的值固定，不允许新增
    if (body.groupKey === 'lead_status') {
      throw new HTTPException(400, { message: '线索状态选项不支持新增' })
    }

    const existing = await c.env.DB.prepare(
      'SELECT id FROM option_items WHERE group_key = ? AND value = ?',
    ).bind(body.groupKey, body.value).first()
    if (existing) throw new HTTPException(409, { message: '该值已存在' })

    const id = uuidv4()
    await c.env.DB.prepare(
      'INSERT INTO option_items (id, group_key, value, label, color, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
    ).bind(id, body.groupKey, body.value, body.label, body.color, body.sortOrder).run()

    const item = await c.env.DB.prepare('SELECT * FROM option_items WHERE id = ?').bind(id).first()
    return c.json({ data: toCamel(item as Record<string, unknown>) }, 201)
  },
)

// PUT /api/admin/options/items/:id — 修改选项
optionsRoutes.put(
  '/items/:id',
  zValidator(
    'json',
    z.object({
      label:     z.string().min(1).optional(),
      color:     z.enum(VALID_COLORS).optional(),
      sortOrder: z.number().int().optional(),
      isActive:  z.boolean().optional(),
    }),
  ),
  async (c) => {
    const id = c.req.param('id')
    const body = c.req.valid('json')

    const existing = await c.env.DB.prepare(
      'SELECT * FROM option_items WHERE id = ?',
    ).bind(id).first<{ id: string; is_system: number }>()
    if (!existing) throw new HTTPException(404, { message: '选项不存在' })

    const updates: string[] = []
    const params: unknown[] = []

    if (body.label !== undefined)     { updates.push('label = ?');      params.push(body.label) }
    if (body.color !== undefined)     { updates.push('color = ?');      params.push(body.color) }
    if (body.sortOrder !== undefined) { updates.push('sort_order = ?'); params.push(body.sortOrder) }
    if (body.isActive !== undefined)  { updates.push('is_active = ?');  params.push(body.isActive ? 1 : 0) }

    if (updates.length === 0) throw new HTTPException(400, { message: '没有可更新的字段' })

    params.push(id)
    await c.env.DB.prepare(
      `UPDATE option_items SET ${updates.join(', ')} WHERE id = ?`,
    ).bind(...params).run()

    const updated = await c.env.DB.prepare('SELECT * FROM option_items WHERE id = ?').bind(id).first()
    return c.json({ data: toCamel(updated as Record<string, unknown>) })
  },
)

// DELETE /api/admin/options/items/:id — 删除选项
optionsRoutes.delete('/items/:id', async (c) => {
  const id = c.req.param('id')
  const existing = await c.env.DB.prepare(
    'SELECT id, is_system FROM option_items WHERE id = ?',
  ).bind(id).first<{ id: string; is_system: number }>()

  if (!existing) throw new HTTPException(404, { message: '选项不存在' })
  if (existing.is_system) throw new HTTPException(400, { message: '系统内置选项不可删除' })

  await c.env.DB.prepare('DELETE FROM option_items WHERE id = ?').bind(id).run()
  return c.json({ data: { success: true } })
})
