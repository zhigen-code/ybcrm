import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { requireAuth } from '../middleware/auth'
import { toCamel, toCamelList } from '../../shared/db'
import { executeWorkflowsForTrigger } from '../workflow/executor'

export const activitiesRoutes = new Hono<{ Bindings: Env }>()

activitiesRoutes.use('*', requireAuth)

const ACTIVITY_SELECT = `
  SELECT sa.*, u.name as user_name, c.name as client_name, l.name as lead_name,
    (SELECT json_group_array(json_object('key', aa.r2_object_key, 'name', aa.file_name, 'size', aa.file_size))
     FROM activity_attachments aa WHERE aa.activity_id = sa.id) as raw_attachments
  FROM sales_activities sa
  LEFT JOIN users u ON sa.user_id = u.id
  LEFT JOIN clients c ON sa.client_id = c.id
  LEFT JOIN leads l ON sa.lead_id = l.id`

const ACTIVITY_COUNT_FROM = `
  FROM sales_activities sa
  LEFT JOIN users u ON sa.user_id = u.id
  LEFT JOIN clients c ON sa.client_id = c.id
  LEFT JOIN leads l ON sa.lead_id = l.id`

function parseAttachments(raw: unknown): { key: string; name: string; size: number }[] {
  if (!raw || raw === 'null') return []
  try { return JSON.parse(raw as string) } catch { return [] }
}

function parseExtraData(raw: unknown): Record<string, unknown> | null {
  if (!raw) return null
  try { return JSON.parse(raw as string) } catch { return null }
}

activitiesRoutes.get('/', async (c) => {
  const {
    clientId, leadId, search,
    activityType, assignedUserId, entityType,
    activityDate, nextContact,
    page: pageStr, pageSize: pageSizeStr,
  } = c.req.query()
  const { userId, role } = c.get('jwtPayload')

  const page = Math.max(1, parseInt(pageStr ?? '1'))
  const pageSize = Math.min(100, Math.max(1, parseInt(pageSizeStr ?? '20')))
  const offset = (page - 1) * pageSize

  let whereClause = 'WHERE 1=1'
  const params: unknown[] = []

  // sales 只能看自己负责的线索/客户的活动
  if (role === 'sales') {
    whereClause += ' AND (l.assigned_to_userId = ? OR c.assigned_sales_userId = ?)'
    params.push(userId, userId)
  }

  if (clientId && leadId) {
    whereClause += ' AND (sa.client_id = ? OR sa.lead_id = ?)'
    params.push(clientId, leadId)
  } else if (clientId) {
    whereClause += ' AND sa.client_id = ?'
    params.push(clientId)
  } else if (leadId) {
    whereClause += ' AND sa.lead_id = ?'
    params.push(leadId)
  }

  if (activityType) {
    whereClause += ' AND sa.activity_type = ?'
    params.push(activityType)
  }

  if (assignedUserId && role !== 'sales') {
    whereClause += ' AND sa.user_id = ?'
    params.push(assignedUserId)
  }

  if (entityType === 'lead') {
    whereClause += ' AND sa.lead_id IS NOT NULL AND sa.client_id IS NULL'
  } else if (entityType === 'client') {
    whereClause += ' AND sa.client_id IS NOT NULL'
  }

  const now = new Date().toISOString().slice(0, 10)
  if (activityDate === 'today') {
    whereClause += ' AND sa.activity_date >= ? AND sa.activity_date < date(?, "+1 day")'
    params.push(now, now)
  } else if (activityDate === 'week') {
    whereClause += ' AND sa.activity_date >= date(?, "-7 days") AND sa.activity_date <= ?'
    params.push(now, now)
  } else if (activityDate === 'month') {
    whereClause += ' AND sa.activity_date >= date(?, "-30 days") AND sa.activity_date <= ?'
    params.push(now, now)
  }

  if (nextContact === 'overdue') {
    whereClause += ' AND sa.next_contact_date IS NOT NULL AND sa.next_contact_date < ?'
    params.push(now)
  } else if (nextContact === 'today') {
    whereClause += ' AND sa.next_contact_date = ?'
    params.push(now)
  } else if (nextContact === 'week') {
    whereClause += ' AND sa.next_contact_date >= ? AND sa.next_contact_date <= date(?, "+7 days")'
    params.push(now, now)
  }

  if (search) {
    whereClause += ' AND (sa.description LIKE ? OR u.name LIKE ? OR c.name LIKE ? OR l.name LIKE ?)'
    const q = `%${search}%`
    params.push(q, q, q, q)
  }

  const countRow = await c.env.DB.prepare(
    `SELECT COUNT(*) as total ${ACTIVITY_COUNT_FROM} ${whereClause}`,
  ).bind(...params).first<{ total: number }>()
  const total = countRow?.total ?? 0

  const results = await c.env.DB.prepare(
    `${ACTIVITY_SELECT} ${whereClause} ORDER BY sa.created_at DESC LIMIT ? OFFSET ?`,
  ).bind(...params, pageSize, offset).all()

  const data = toCamelList(results.results as Record<string, unknown>[]).map((a) => ({
    ...a,
    attachments: parseAttachments(a.rawAttachments),
    extraData: parseExtraData(a.extraData),
    rawAttachments: undefined,
  }))
  return c.json({ data, total, page, pageSize })
})

activitiesRoutes.post(
  '/',
  zValidator(
    'json',
    z.object({
      clientId: z.string().nullable().optional(),
      leadId: z.string().nullable().optional(),
      activityType: z.string().min(1, '请选择跟进类型'),
      description: z.string().nullable().optional(),
      activityDate: z.string().min(1),
      nextContactDate: z.string().nullable().optional(),
      extraData: z.record(z.unknown()).nullable().optional(),
      attachmentKeys: z.array(z.object({
        key: z.string(),
        name: z.string(),
        size: z.number(),
      })).optional().default([]),
    }),
  ),
  async (c) => {
    const body = c.req.valid('json')
    const { userId } = c.get('jwtPayload')

    // 动态验证 activityType 是否在 option_items 中
    const validType = await c.env.DB.prepare(
      "SELECT id FROM option_items WHERE group_key = 'activity_type' AND value = ? AND is_active = 1",
    ).bind(body.activityType).first()
    if (!validType) {
      return c.json({ message: '无效的跟进类型' }, 400)
    }
    const id = uuidv4()

    await c.env.DB.prepare(
      `INSERT INTO sales_activities (id, client_id, lead_id, user_id, activity_type, description, activity_date, next_contact_date, extra_data)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(id, body.clientId ?? null, body.leadId ?? null, userId, body.activityType, body.description ?? null, body.activityDate, body.nextContactDate ?? null, body.extraData ? JSON.stringify(body.extraData) : null)
      .run()

    if (body.attachmentKeys.length > 0) {
      const stmts = body.attachmentKeys.map((att) =>
        c.env.DB.prepare(
          'INSERT INTO activity_attachments (id, activity_id, r2_object_key, file_name, file_size) VALUES (?, ?, ?, ?, ?)',
        ).bind(uuidv4(), id, att.key, att.name, att.size),
      )
      await c.env.DB.batch(stmts)
    }

    // 同步更新下次联系日期
    if (body.clientId && body.nextContactDate) {
      await c.env.DB.prepare(
        'UPDATE clients SET next_contact_date = ? WHERE id = ?',
      ).bind(body.nextContactDate, body.clientId).run()
    }
    if (body.leadId && body.nextContactDate) {
      await c.env.DB.prepare(
        'UPDATE leads SET next_contact_date = ? WHERE id = ?',
      ).bind(body.nextContactDate, body.leadId).run()
    }

    const rawActivity = await c.env.DB.prepare(
      `${ACTIVITY_SELECT} WHERE sa.id = ?`,
    ).bind(id).first()
    const rawAct = toCamel(rawActivity as Record<string, unknown>)
    const activity = {
      ...rawAct,
      attachments: parseAttachments((rawActivity as Record<string, unknown>).raw_attachments),
      extraData: parseExtraData(rawAct.extraData),
      rawAttachments: undefined,
    }

    // 触发跟进工作流
    c.executionCtx.waitUntil(
      executeWorkflowsForTrigger(c.env.DB, c.env, 'activity', id, { type: 'on_create' })
        .catch((err) => console.error('[workflow/activity] on_create failed:', err)),
    )

    return c.json({ data: activity }, 201)
  },
)
