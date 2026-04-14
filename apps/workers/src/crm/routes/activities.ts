import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { requireAuth } from '../middleware/auth'
import { toCamel, toCamelList } from '../../shared/db'

export const activitiesRoutes = new Hono<{ Bindings: Env }>()

activitiesRoutes.use('*', requireAuth)

const ACTIVITY_SELECT = 'SELECT sa.*, u.name as user_name FROM sales_activities sa LEFT JOIN users u ON sa.user_id = u.id'

activitiesRoutes.get('/', async (c) => {
  const { clientId, leadId } = c.req.query()
  let whereClause = 'WHERE 1=1'
  const params: unknown[] = []

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

  const results = await c.env.DB.prepare(
    `${ACTIVITY_SELECT} ${whereClause} ORDER BY sa.created_at DESC`,
  ).bind(...params).all()
  return c.json({ data: toCamelList(results.results as Record<string, unknown>[]) })
})

activitiesRoutes.post(
  '/',
  zValidator(
    'json',
    z.object({
      clientId: z.string().nullable().optional(),
      leadId: z.string().nullable().optional(),
      activityType: z.enum(['Call', 'Meeting', 'Email', 'Note']),
      description: z.string().nullable().optional(),
      activityDate: z.string().min(1),
    }),
  ),
  async (c) => {
    const body = c.req.valid('json')
    const { userId } = c.get('jwtPayload')
    const id = uuidv4()

    await c.env.DB.prepare(
      `INSERT INTO sales_activities (id, client_id, lead_id, user_id, activity_type, description, activity_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(id, body.clientId ?? null, body.leadId ?? null, userId, body.activityType, body.description ?? null, body.activityDate)
      .run()

    const activity = await c.env.DB.prepare(
      `${ACTIVITY_SELECT} WHERE sa.id = ?`,
    ).bind(id).first()
    return c.json({ data: toCamel(activity as Record<string, unknown>) }, 201)
  },
)
