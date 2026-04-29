import { Hono } from 'hono'
import { requireAuth, requireAdmin } from '../middleware/auth'

export type FieldType = 'select' | 'datetime' | 'services' | 'text' | 'user' | 'team'

export interface EntityField {
  field: string
  label: string
  type: FieldType
  optionGroup?: string
  triggerOnly?: boolean  // 只作为触发字段，不作为必填字段
}

const BASE_SCHEMA: Record<string, EntityField[]> = {
  lead: [
    { field: 'status',           label: '线索状态',     type: 'select',   optionGroup: 'lead_status' },
    { field: 'lostReason',       label: '丢失原因',     type: 'select',   optionGroup: 'lost_reason' },
    { field: 'source',           label: '来源',         type: 'text',     triggerOnly: true },
    { field: 'assignedToUserId', label: '线索销售',     type: 'user' },
    { field: 'assignedToTeamId', label: '线索团队',     type: 'team' },
    { field: 'intendedServices', label: '意向服务',     type: 'services' },
    { field: 'nextContactDate',  label: '下次联系时间', type: 'datetime' },
  ],
  client: [
    { field: 'contractStatus',      label: '合同状态', type: 'select', optionGroup: 'contract_status' },
    { field: 'assignedSalesUserId', label: '负责销售', type: 'user' },
  ],
  activity: [
    { field: 'activityType', label: '跟进类型', type: 'select', optionGroup: 'activity_type', triggerOnly: true },
  ],
}

const KNOWN_GROUPS = new Set(
  Object.values(BASE_SCHEMA).flat().map((f) => f.optionGroup).filter(Boolean),
)

export const entitySchemaRoutes = new Hono<{ Bindings: Env }>()
entitySchemaRoutes.use('*', requireAuth, requireAdmin)

entitySchemaRoutes.get('/', async (c) => {
  // 动态加载系统中所有 option group
  const rows = await c.env.DB.prepare(
    'SELECT DISTINCT group_key FROM option_items WHERE is_active = 1 ORDER BY group_key',
  ).all<{ group_key: string }>()

  const schema = structuredClone(BASE_SCHEMA)

  // 将数据库中有但 BASE_SCHEMA 未包含的 optionGroup 追加到两个 entity
  for (const { group_key } of rows.results) {
    if (KNOWN_GROUPS.has(group_key)) continue
    const field: EntityField = {
      field:       group_key.replace(/_([a-z])/g, (_, c) => c.toUpperCase()),
      label:       group_key.replace(/_/g, ' '),
      type:        'select',
      optionGroup: group_key,
    }
    schema['lead']?.push(field)
    schema['client']?.push({ ...field })
  }

  return c.json({ data: schema })
})
