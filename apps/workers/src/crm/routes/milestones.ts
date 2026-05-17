import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { requireAuth } from '../middleware/auth'
import { toCamel, toCamelList } from '../../shared/db'

export const milestonesRoutes = new Hono<{ Bindings: Env }>()

milestonesRoutes.use('*', requireAuth)

// GET /api/milestones?clientId=xxx — 获取某客户所有里程碑
milestonesRoutes.get('/', async (c) => {
  const { clientId } = c.req.query()
  if (!clientId) return c.json({ message: 'clientId required' }, 400)

  const rows = await c.env.DB.prepare(
    `SELECT cm.*, s.name as service_name
     FROM client_milestones cm
     LEFT JOIN services s ON cm.service_id = s.id
     WHERE cm.client_id = ?
     ORDER BY cm.step_index ASC`,
  ).bind(clientId).all()

  return c.json({ data: toCamelList(rows.results as Record<string, unknown>[]) })
})

// POST /api/milestones/init — 根据客户关联的服务初始化里程碑
milestonesRoutes.post(
  '/init',
  zValidator('json', z.object({
    clientId: z.string().min(1),
    serviceId: z.string().min(1),
  })),
  async (c) => {
    const { clientId, serviceId } = c.req.valid('json')

    // 检查该客户+服务是否已有里程碑
    const existing = await c.env.DB.prepare(
      'SELECT id FROM client_milestones WHERE client_id = ? AND service_id = ?',
    ).bind(clientId, serviceId).first()
    if (existing) return c.json({ message: '该服务里程碑已初始化' }, 409)

    // 获取服务的流程步骤
    const service = await c.env.DB.prepare(
      'SELECT process_steps FROM services WHERE id = ?',
    ).bind(serviceId).first<{ process_steps: string }>()
    if (!service) return c.json({ message: '服务不存在' }, 404)

    const steps: string[] = JSON.parse(service.process_steps || '[]')
    if (steps.length === 0) return c.json({ message: '该服务没有配置流程步骤' }, 400)

    const stmts = steps.map((stepName, idx) =>
      c.env.DB.prepare(
        `INSERT INTO client_milestones (id, client_id, service_id, step_index, step_name, status)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).bind(uuidv4(), clientId, serviceId, idx, stepName, idx === 0 ? 'in_progress' : 'pending'),
    )
    await c.env.DB.batch(stmts)

    const rows = await c.env.DB.prepare(
      `SELECT cm.*, s.name as service_name
       FROM client_milestones cm
       LEFT JOIN services s ON cm.service_id = s.id
       WHERE cm.client_id = ? AND cm.service_id = ?
       ORDER BY cm.step_index ASC`,
    ).bind(clientId, serviceId).all()

    return c.json({ data: toCamelList(rows.results as Record<string, unknown>[]) }, 201)
  },
)

// PUT /api/milestones/:id — 更新单个里程碑
milestonesRoutes.put(
  '/:id',
  zValidator('json', z.object({
    status: z.enum(['pending', 'in_progress', 'completed', 'skipped']).optional(),
    expectedDate: z.string().nullable().optional(),
    completedDate: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
  })),
  async (c) => {
    const id = c.req.param('id')
    const body = c.req.valid('json')

    const milestone = await c.env.DB.prepare(
      'SELECT * FROM client_milestones WHERE id = ?',
    ).bind(id).first<{ id: string; status: string }>()
    if (!milestone) return c.json({ message: '里程碑不存在' }, 404)

    const updates: string[] = ['updated_at = datetime(\'now\')']
    const params: unknown[] = []

    if (body.status !== undefined) {
      updates.push('status = ?')
      params.push(body.status)
      if (body.status === 'completed' && !body.completedDate) {
        updates.push('completed_date = date(\'now\')')
      }
    }
    if (body.expectedDate !== undefined) { updates.push('expected_date = ?'); params.push(body.expectedDate) }
    if (body.completedDate !== undefined) { updates.push('completed_date = ?'); params.push(body.completedDate) }
    if (body.notes !== undefined) { updates.push('notes = ?'); params.push(body.notes) }

    params.push(id)
    await c.env.DB.prepare(
      `UPDATE client_milestones SET ${updates.join(', ')} WHERE id = ?`,
    ).bind(...params).run()

    const updated = await c.env.DB.prepare(
      `SELECT cm.*, s.name as service_name
       FROM client_milestones cm
       LEFT JOIN services s ON cm.service_id = s.id
       WHERE cm.id = ?`,
    ).bind(id).first()

    return c.json({ data: toCamel(updated as Record<string, unknown>) })
  },
)

// DELETE /api/milestones?clientId=xxx&serviceId=xxx — 删除某客户某服务的所有里程碑（重置用）
milestonesRoutes.delete('/', async (c) => {
  const { clientId, serviceId } = c.req.query()
  if (!clientId || !serviceId) return c.json({ message: 'clientId and serviceId required' }, 400)

  await c.env.DB.prepare(
    'DELETE FROM client_milestones WHERE client_id = ? AND service_id = ?',
  ).bind(clientId, serviceId).run()

  return c.json({ success: true })
})
