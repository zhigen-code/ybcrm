import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { HTTPException } from 'hono/http-exception'
import { v4 as uuidv4 } from 'uuid'
import { requireAuth } from '../middleware/auth'
import { toCamel, toCamelList } from '../../shared/db'

export const leadsRoutes = new Hono<{ Bindings: Env }>()

leadsRoutes.use('*', requireAuth)

const BASE_JOIN = 'FROM leads l LEFT JOIN users u ON l.created_by_userId = u.id LEFT JOIN users assign_u ON l.assigned_to_userId = assign_u.id'
const SELECT_COLS = 'SELECT l.*, u.name as created_by_name, assign_u.name as assigned_to_name'

function parseLead(row: Record<string, unknown>) {
  const lead = toCamel(row) as Record<string, unknown>
  if (typeof lead.intendedServices === 'string') {
    try { lead.intendedServices = JSON.parse(lead.intendedServices as string) } catch { lead.intendedServices = [] }
  }
  return lead
}

// GET /api/leads/sources — 返回去重的来源列表（用于前端自动补全）
leadsRoutes.get('/sources', async (c) => {
  const rows = await c.env.DB.prepare(
    "SELECT DISTINCT source FROM leads WHERE source IS NOT NULL AND source != '' ORDER BY source ASC",
  ).all<{ source: string }>()
  return c.json({ data: rows.results.map((r) => r.source) })
})

// GET /api/leads
leadsRoutes.get('/', async (c) => {
  const { userId, role, teamId } = c.get('jwtPayload')
  const { status, mine, search, page = '1', pageSize = '20' } = c.req.query()
  const offset = (Number(page) - 1) * Number(pageSize)

  let whereClause = 'WHERE 1=1'
  const whereParams: unknown[] = []

  if (role === 'sales') {
    whereClause += ' AND (l.assigned_to_userId = ? OR l.assigned_to_teamId = ?)'
    whereParams.push(userId, teamId)
  } else if (mine === 'true') {
    whereClause += ' AND l.assigned_to_userId = ?'
    whereParams.push(userId)
  }
  if (status) {
    whereClause += ' AND l.status = ?'
    whereParams.push(status)
  }
  if (search) {
    whereClause += ' AND (l.name LIKE ? OR l.contact_info LIKE ? OR l.source LIKE ? OR CAST(l.lead_no AS TEXT) LIKE ?)'
    const q = `%${search}%`
    whereParams.push(q, q, q, q)
  }

  const results = await c.env.DB.prepare(
    `${SELECT_COLS} ${BASE_JOIN} ${whereClause} ORDER BY l.created_at DESC LIMIT ? OFFSET ?`,
  ).bind(...whereParams, Number(pageSize), offset).all()

  const countResult = await c.env.DB.prepare(
    `SELECT COUNT(*) as total ${BASE_JOIN} ${whereClause}`,
  ).bind(...whereParams).first<{ total: number }>()

  return c.json({
    data: (results.results as Record<string, unknown>[]).map(parseLead),
    total: countResult?.total ?? 0,
    page: Number(page),
    pageSize: Number(pageSize),
  })
})

// GET /api/leads/:id
leadsRoutes.get('/:id', async (c) => {
  const lead = await c.env.DB.prepare(
    `${SELECT_COLS} ${BASE_JOIN} WHERE l.id = ?`,
  ).bind(c.req.param('id')).first()
  if (!lead) throw new HTTPException(404, { message: '线索不存在' })
  return c.json({ data: parseLead(lead as Record<string, unknown>) })
})

const leadSchema = z.object({
  source: z.string().min(1),
  name: z.string().min(1),
  contactInfo: z.string().min(1),
  intendedServices: z.array(z.string()).min(1, '请至少选择一个意向服务'),
  notes: z.string().nullable().optional(),
})

// POST /api/leads
leadsRoutes.post('/', zValidator('json', leadSchema), async (c) => {
  const body = c.req.valid('json')
  const { userId } = c.get('jwtPayload')
  const id = uuidv4()

  await c.env.DB.prepare(
    `INSERT INTO leads (id, source, name, contact_info, intended_service, intended_services, status, notes, created_by_userId, lead_no)
     VALUES (?, ?, ?, ?, ?, ?, 'New', ?, ?, (SELECT COALESCE(MAX(lead_no), 0) + 1 FROM leads))`,
  ).bind(
    id,
    body.source,
    body.name,
    body.contactInfo,
    body.intendedServices[0],           // 旧列保持兼容：取第一个服务
    JSON.stringify(body.intendedServices),
    body.notes ?? null,
    userId,
  ).run()

  // 推送到线索分配队列
  await c.env.LEAD_ASSIGNMENT_QUEUE.send({ leadId: id })

  const lead = await c.env.DB.prepare(
    `${SELECT_COLS} ${BASE_JOIN} WHERE l.id = ?`,
  ).bind(id).first()
  return c.json({ data: parseLead(lead as Record<string, unknown>) }, 201)
})

// PUT /api/leads/:id
leadsRoutes.put(
  '/:id',
  zValidator(
    'json',
    z.object({
      status: z.enum(['New', 'Contacted', 'Qualified', 'Converted', 'Lost']).optional(),
      notes: z.string().nullable().optional(),
      assignedToUserId: z.string().nullable().optional(),
      assignedToTeamId: z.string().nullable().optional(),
      contactInfo: z.string().optional(),
      intendedServices: z.array(z.string()).min(1).optional(),
    }),
  ),
  async (c) => {
    const id = c.req.param('id')
    const body = c.req.valid('json')
    const { role, userId } = c.get('jwtPayload')

    const lead = await c.env.DB.prepare('SELECT * FROM leads WHERE id = ?').bind(id).first<{
      assigned_to_userId: string | null; status: string; notes: string | null
      contact_info: string; assigned_to_teamId: string | null; intended_services: string
    }>()
    if (!lead) throw new HTTPException(404, { message: '线索不存在' })

    if (lead.status === 'Converted') {
      throw new HTTPException(403, { message: '线索已转化，不可修改' })
    }

    if (role === 'sales' && lead.assigned_to_userId !== userId) {
      throw new HTTPException(403, { message: '无权操作此线索' })
    }

    const updates: string[] = ['updated_at = CURRENT_TIMESTAMP']
    const params: unknown[] = []

    if (body.status !== undefined) { updates.push('status = ?'); params.push(body.status) }
    if (body.notes !== undefined) { updates.push('notes = ?'); params.push(body.notes) }
    if (body.assignedToUserId !== undefined) { updates.push('assigned_to_userId = ?'); params.push(body.assignedToUserId) }
    if (body.assignedToTeamId !== undefined) { updates.push('assigned_to_teamId = ?'); params.push(body.assignedToTeamId) }
    if (body.contactInfo !== undefined) { updates.push('contact_info = ?'); params.push(body.contactInfo) }
    if (body.intendedServices !== undefined) {
      updates.push('intended_services = ?')
      updates.push('intended_service = ?')
      params.push(JSON.stringify(body.intendedServices))
      params.push(body.intendedServices[0])
    }

    params.push(id)
    await c.env.DB.prepare(`UPDATE leads SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...params)
      .run()

    // ── current_leads_count 维护 ──
    const TERMINAL = ['Converted', 'Lost']
    const wasActive = !TERMINAL.includes(lead.status)
    const newStatus = body.status ?? lead.status
    const becomingTerminal = wasActive && TERMINAL.includes(newStatus)
    const reassigning = body.assignedToUserId !== undefined && body.assignedToUserId !== lead.assigned_to_userId

    if (becomingTerminal) {
      // 线索关闭 → 减少原负责人计数
      if (lead.assigned_to_userId) {
        await c.env.DB.prepare(
          'UPDATE users SET current_leads_count = MAX(0, current_leads_count - 1) WHERE id = ?',
        ).bind(lead.assigned_to_userId).run()
      }
    } else if (reassigning && wasActive) {
      // 重新分配（仅限活跃线索）→ 旧人 -1，新人 +1
      if (lead.assigned_to_userId) {
        await c.env.DB.prepare(
          'UPDATE users SET current_leads_count = MAX(0, current_leads_count - 1) WHERE id = ?',
        ).bind(lead.assigned_to_userId).run()
      }
      if (body.assignedToUserId) {
        await c.env.DB.prepare(
          'UPDATE users SET current_leads_count = current_leads_count + 1 WHERE id = ?',
        ).bind(body.assignedToUserId).run()
      }
    }

    // 记录修改操作
    const statusLabels: Record<string, string> = {
      New: '新线索', Contacted: '已联系', Qualified: '已确认', Converted: '已转化', Lost: '已丢失',
    }
    const changes: string[] = []
    const oldServices = (() => { try { return JSON.parse(lead.intended_services) } catch { return [] } })() as string[]
    if (body.status !== undefined && body.status !== lead.status) changes.push(`状态→${statusLabels[body.status] ?? body.status}`)
    if (body.notes !== undefined && body.notes !== lead.notes) changes.push('备注已更新')
    if (body.contactInfo !== undefined && body.contactInfo !== lead.contact_info) changes.push('联系方式已更新')
    if (body.intendedServices !== undefined && JSON.stringify(body.intendedServices) !== JSON.stringify(oldServices)) {
      changes.push(`意向服务：${oldServices.join('、')} → ${body.intendedServices.join('、')}`)
    }
    if (body.assignedToUserId !== undefined && body.assignedToUserId !== lead.assigned_to_userId) changes.push('负责人已变更')
    if (changes.length > 0) {
      await c.env.DB.prepare(
        `INSERT INTO sales_activities (id, lead_id, user_id, activity_type, description, activity_date)
         VALUES (?, ?, ?, 'Note', ?, CURRENT_TIMESTAMP)`,
      ).bind(uuidv4(), id, userId, `【系统】${changes.join('；')}`).run()
    }

    const updated = await c.env.DB.prepare(
      `${SELECT_COLS} ${BASE_JOIN} WHERE l.id = ?`,
    ).bind(id).first()
    return c.json({ data: parseLead(updated as Record<string, unknown>) })
  },
)
