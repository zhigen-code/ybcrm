import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { HTTPException } from 'hono/http-exception'
import { v4 as uuidv4 } from 'uuid'
import { requireAuth } from '../middleware/auth'
import { toCamel, toCamelList } from '../../shared/db'

export const clientsRoutes = new Hono<{ Bindings: Env }>()

clientsRoutes.use('*', requireAuth)

const BASE_JOIN = 'FROM clients c LEFT JOIN users u ON c.created_by_userId = u.id'
const SELECT_COLS = 'SELECT c.*, u.name as created_by_name'

function parseClient(row: Record<string, unknown>) {
  const client = toCamel(row) as Record<string, unknown>
  if (typeof client.detailedProfile === 'string') {
    try { client.detailedProfile = JSON.parse(client.detailedProfile as string) } catch { client.detailedProfile = {} }
  }
  if (typeof client.servicePlans === 'string') {
    try { client.servicePlans = JSON.parse(client.servicePlans as string) } catch { client.servicePlans = [] }
  }
  return client
}

// GET /api/clients
clientsRoutes.get('/', async (c) => {
  const { role, userId } = c.get('jwtPayload')
  const { page = '1', pageSize = '20' } = c.req.query()
  const offset = (Number(page) - 1) * Number(pageSize)

  let whereClause = 'WHERE 1=1'
  const whereParams: unknown[] = []

  if (role === 'sales') {
    whereClause += ' AND c.assigned_sales_userId = ?'
    whereParams.push(userId)
  }

  const results = await c.env.DB.prepare(
    `${SELECT_COLS} ${BASE_JOIN} ${whereClause} ORDER BY c.created_at DESC LIMIT ? OFFSET ?`,
  ).bind(...whereParams, Number(pageSize), offset).all()

  return c.json({ data: (results.results as Record<string, unknown>[]).map(parseClient) })
})

// GET /api/clients/:id
clientsRoutes.get('/:id', async (c) => {
  const client = await c.env.DB.prepare(
    `${SELECT_COLS} ${BASE_JOIN} WHERE c.id = ?`,
  ).bind(c.req.param('id')).first()
  if (!client) throw new HTTPException(404, { message: '客户不存在' })
  return c.json({ data: parseClient(client as Record<string, unknown>) })
})

// POST /api/clients (线索转化)
clientsRoutes.post(
  '/',
  zValidator(
    'json',
    z.object({
      leadId: z.string().nullable().optional(),
      name: z.string().min(1),
      email: z.string().email().nullable().optional(),
      phone: z.string().nullable().optional(),
      detailedProfile: z.record(z.unknown()).optional(),
      servicePlans: z.array(z.string()).optional(),
      assignedSalesUserId: z.string().nullable().optional(),
    }),
  ),
  async (c) => {
    const body = c.req.valid('json')
    const { userId } = c.get('jwtPayload')
    const id = uuidv4()

    // 从线索获取备注、来源和负责人（用于后续减少计数）
    let leadNotes: string | null = null
    let leadSource: string | null = null
    let leadAssignedUserId: string | null = null
    let leadStatus: string = ''
    if (body.leadId) {
      const lead = await c.env.DB.prepare(
        'SELECT notes, source, assigned_to_userId, status FROM leads WHERE id = ?',
      ).bind(body.leadId).first<{
        notes: string | null; source: string | null
        assigned_to_userId: string | null; status: string
      }>()
      leadNotes = lead?.notes ?? null
      leadSource = lead?.source ?? null
      leadAssignedUserId = lead?.assigned_to_userId ?? null
      leadStatus = lead?.status ?? ''
    }

    const detailedProfile = JSON.stringify({
      ...(body.detailedProfile ?? {}),
      notes: leadNotes,
      source: leadSource,
    })

    const servicePlans = body.servicePlans ?? []

    await c.env.DB.prepare(
      `INSERT INTO clients (id, lead_id, name, email, phone, detailed_profile, service_plan, service_plans, assigned_sales_userId, created_by_userId)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        id,
        body.leadId ?? null,
        body.name,
        body.email ?? null,
        body.phone ?? null,
        detailedProfile,
        servicePlans[0] ?? null,           // 旧列兼容
        JSON.stringify(servicePlans),
        body.assignedSalesUserId ?? null,
        userId,
      )
      .run()

    // 如果来自线索转化，更新线索状态并迁移跟进记录
    if (body.leadId) {
      await c.env.DB.prepare("UPDATE leads SET status = 'Converted', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .bind(body.leadId)
        .run()
      // 如果线索原本处于活跃状态，减少负责人的线索计数
      const wasActive = !['Converted', 'Lost'].includes(leadStatus)
      if (wasActive && leadAssignedUserId) {
        await c.env.DB.prepare(
          'UPDATE users SET current_leads_count = MAX(0, current_leads_count - 1) WHERE id = ?',
        ).bind(leadAssignedUserId).run()
      }
      // 将该线索下所有跟进记录关联到新客户
      await c.env.DB.prepare('UPDATE sales_activities SET client_id = ? WHERE lead_id = ? AND client_id IS NULL')
        .bind(id, body.leadId)
        .run()
      // 创建转化系统记录
      const activityId = uuidv4()
      await c.env.DB.prepare(
        `INSERT INTO sales_activities (id, client_id, lead_id, user_id, activity_type, description, activity_date)
         VALUES (?, ?, ?, ?, 'Note', '【系统】线索已转化为客户', CURRENT_TIMESTAMP)`,
      ).bind(activityId, id, body.leadId, userId).run()
    }

    const client = await c.env.DB.prepare(
      `${SELECT_COLS} ${BASE_JOIN} WHERE c.id = ?`,
    ).bind(id).first()
    return c.json({ data: parseClient(client as Record<string, unknown>) }, 201)
  },
)

// PUT /api/clients/:id
clientsRoutes.put(
  '/:id',
  zValidator(
    'json',
    z.object({
      name: z.string().optional(),
      email: z.string().email().nullable().optional(),
      phone: z.string().nullable().optional(),
      detailedProfile: z.record(z.unknown()).optional(),
      servicePlans: z.array(z.string()).optional(),
      contractStatus: z.string().nullable().optional(),
      assignedSalesUserId: z.string().nullable().optional(),
    }),
  ),
  async (c) => {
    const id = c.req.param('id')
    const body = c.req.valid('json')

    const existing = await c.env.DB.prepare(
      'SELECT id, name, phone, email, service_plan, service_plans, contract_status, assigned_sales_userId FROM clients WHERE id = ?',
    ).bind(id).first<{
      id: string; name: string | null; phone: string | null; email: string | null
      service_plan: string | null; service_plans: string; contract_status: string | null; assigned_sales_userId: string | null
    }>()
    if (!existing) throw new HTTPException(404, { message: '客户不存在' })

    const existingPlans: string[] = (() => { try { return JSON.parse(existing.service_plans) } catch { return [] } })()

    const updates: string[] = ['updated_at = CURRENT_TIMESTAMP']
    const params: unknown[] = []

    if (body.name !== undefined) { updates.push('name = ?'); params.push(body.name) }
    if (body.email !== undefined) { updates.push('email = ?'); params.push(body.email) }
    if (body.phone !== undefined) { updates.push('phone = ?'); params.push(body.phone) }
    if (body.detailedProfile !== undefined) { updates.push('detailed_profile = ?'); params.push(JSON.stringify(body.detailedProfile)) }
    if (body.servicePlans !== undefined) {
      updates.push('service_plans = ?')
      updates.push('service_plan = ?')
      params.push(JSON.stringify(body.servicePlans))
      params.push(body.servicePlans[0] ?? null)
    }
    if (body.contractStatus !== undefined) { updates.push('contract_status = ?'); params.push(body.contractStatus) }
    if (body.assignedSalesUserId !== undefined) { updates.push('assigned_sales_userId = ?'); params.push(body.assignedSalesUserId) }

    params.push(id)
    await c.env.DB.prepare(`UPDATE clients SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...params)
      .run()

    // 只记录实际发生变化的字段
    const { userId } = c.get('jwtPayload')
    const changes: string[] = []
    if (body.name !== undefined && body.name !== existing.name) changes.push(`姓名：${existing.name ?? '（空）'} → ${body.name}`)
    if (body.phone !== undefined && body.phone !== existing.phone) changes.push(`电话：${existing.phone ?? '（空）'} → ${body.phone ?? '（已清除）'}`)
    if (body.email !== undefined && body.email !== existing.email) changes.push(`邮箱：${existing.email ?? '（空）'} → ${body.email ?? '（已清除）'}`)
    if (body.servicePlans !== undefined && JSON.stringify(body.servicePlans) !== JSON.stringify(existingPlans)) {
      changes.push(`服务套餐：${existingPlans.join('、') || '（空）'} → ${body.servicePlans.join('、') || '（已清除）'}`)
    }
    if (body.contractStatus !== undefined && body.contractStatus !== existing.contract_status) changes.push(`合同状态：${existing.contract_status ?? '（空）'} → ${body.contractStatus ?? '（已清除）'}`)
    if (body.assignedSalesUserId !== undefined && body.assignedSalesUserId !== existing.assigned_sales_userId) {
      const [oldUser, newUser] = await Promise.all([
        existing.assigned_sales_userId
          ? c.env.DB.prepare('SELECT name FROM users WHERE id = ?').bind(existing.assigned_sales_userId).first<{ name: string }>()
          : null,
        body.assignedSalesUserId
          ? c.env.DB.prepare('SELECT name FROM users WHERE id = ?').bind(body.assignedSalesUserId).first<{ name: string }>()
          : null,
      ])
      changes.push(`负责人：${oldUser?.name ?? '（未分配）'} → ${newUser?.name ?? '（未分配）'}`)
    }
    if (changes.length > 0) {
      await c.env.DB.prepare(
        `INSERT INTO sales_activities (id, client_id, user_id, activity_type, description, activity_date)
         VALUES (?, ?, ?, 'Note', ?, CURRENT_TIMESTAMP)`,
      ).bind(uuidv4(), id, userId, `【系统】${changes.join('；')}`).run()
    }

    const updated = await c.env.DB.prepare(
      `${SELECT_COLS} ${BASE_JOIN} WHERE c.id = ?`,
    ).bind(id).first()
    return c.json({ data: parseClient(updated as Record<string, unknown>) })
  },
)
