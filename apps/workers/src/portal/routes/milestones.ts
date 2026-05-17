import { Hono } from 'hono'
import { requirePortalAuth } from '../middleware/auth'
import { toCamelList } from '../../shared/db'

export const portalMilestonesRoutes = new Hono<{ Bindings: Env }>()

portalMilestonesRoutes.use('*', requirePortalAuth)

portalMilestonesRoutes.get('/', async (c) => {
  const { clientId } = c.get('portalPayload')

  const rows = await c.env.DB.prepare(
    `SELECT cm.id, cm.service_id, cm.step_index, cm.step_name, cm.status,
            cm.expected_date, cm.completed_date, cm.notes, s.name as service_name
     FROM client_milestones cm
     LEFT JOIN services s ON cm.service_id = s.id
     WHERE cm.client_id = ?
     ORDER BY cm.step_index ASC`,
  ).bind(clientId).all()

  return c.json({ data: toCamelList(rows.results as Record<string, unknown>[]) })
})
