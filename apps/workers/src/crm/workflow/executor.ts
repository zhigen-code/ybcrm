import { toCamel } from '../../shared/db'

// ── 类型 ──────────────────────────────────────────────────────────────────────

type WfTrigger =
  | { type: 'field_change'; field: string; to: string }
  | { type: 'on_create' }

type WfAction =
  | { type: 'require_activity'; contentRequired: boolean; contentPresets?: string[] }
  | { type: 'require_fields'; fields: unknown[] }
  | { type: 'set_field'; field: string; label: string; value: string }
  | { type: 'send_email'; to: string; subject: string; body: string }
  | { type: 'webhook'; url: string; method: string; body: string }

interface StoredWorkflow {
  id: string
  entity_type: string
  trigger: string
  actions: string
  is_active: number
}

// ── 字段名映射（camelCase → DB 列名）──────────────────────────────────────────

const FIELD_TO_COLUMN: Record<string, Record<string, string>> = {
  lead: {
    status:            'status',
    lostReason:        'lost_reason',
    source:            'source',
    assignedToUserId:  'assigned_to_userId',
    intendedServices:  'intended_services',
    nextContactDate:   'next_contact_date',
    notes:             'notes',
    contactInfo:       'contact_info',
  },
  client: {
    contractStatus:      'contract_status',
    assignedSalesUserId: 'assigned_sales_userId',
    name:  'name',
    email: 'email',
    phone: 'phone',
  },
}

// ── 模板插值：支持 {{field}} 和 {{entity.field}} ─────────────────────────────

function interpolate(template: string, data: Record<string, unknown>): string {
  return template.replace(/\{\{[\w.]*?(\w+)\}\}/g, (_, field: string) => {
    const val = data[field]
    if (Array.isArray(val)) return val.join('、')
    return val != null ? String(val) : ''
  })
}

// ── 解析 stored workflow，防御 double-JSON ────────────────────────────────────

function parseWorkflow(row: StoredWorkflow): { trigger: WfTrigger; actions: WfAction[] } {
  let trigger: WfTrigger
  try { trigger = typeof row.trigger === 'string' ? JSON.parse(row.trigger) : row.trigger }
  catch { trigger = { type: 'on_create' } }

  let actions: WfAction[] = []
  try {
    const raw = typeof row.actions === 'string' ? JSON.parse(row.actions) : row.actions
    actions = (Array.isArray(raw) ? raw : []).map((a: unknown) =>
      typeof a === 'string' ? JSON.parse(a) : a,
    ) as WfAction[]
  } catch { /* ignore */ }

  return { trigger, actions }
}

// ── 触发条件匹配 ──────────────────────────────────────────────────────────────

function matchesTrigger(
  wfTrigger: WfTrigger,
  event: { type: 'on_create' } | { type: 'field_change'; field: string; to: string },
): boolean {
  if (wfTrigger.type !== event.type) return false
  if (event.type === 'field_change' && wfTrigger.type === 'field_change') {
    return wfTrigger.field === event.field && wfTrigger.to === event.to
  }
  return true
}

// ── 邮件发送（SendGrid）──────────────────────────────────────────────────────

async function sendEmail(
  env: Env,
  db: D1Database,
  to: string,
  subject: string,
  body: string,
): Promise<void> {
  if (!env.SENDGRID_API_KEY) return

  const rows = await db.prepare(
    "SELECT key, value FROM system_settings WHERE key IN ('smtp_from_email', 'smtp_from_name')",
  ).all<{ key: string; value: string }>()
  const cfg = Object.fromEntries(rows.results.map((r) => [r.key, r.value]))
  const fromEmail = cfg['smtp_from_email'] ?? 'noreply@example.com'
  const fromName  = cfg['smtp_from_name']  ?? ''

  await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.SENDGRID_API_KEY}`,
    },
    body: JSON.stringify({
      from: { email: fromEmail, name: fromName },
      personalizations: [{ to: [{ email: to }], subject }],
      content: [{ type: 'text/plain', value: body }],
    }),
  })
}

// ── 主入口 ────────────────────────────────────────────────────────────────────

export async function executeWorkflowsForTrigger(
  db: D1Database,
  env: Env,
  entityType: 'lead' | 'client',
  entityId: string,
  event: { type: 'on_create' } | { type: 'field_change'; field: string; to: string },
): Promise<void> {
  // 1. 查询该实体类型的所有启用工作流
  const rows = await db.prepare(
    'SELECT id, entity_type, trigger, actions, is_active FROM workflows WHERE entity_type = ? AND is_active = 1',
  ).bind(entityType).all<StoredWorkflow>()

  const matched = rows.results.filter((row) => {
    const { trigger } = parseWorkflow(row)
    return matchesTrigger(trigger, event)
  })
  if (!matched.length) return

  // 2. 读取实体最新数据（用于模板插值 + set_field 后续读取）
  const table = entityType === 'lead' ? 'leads' : 'clients'
  const raw = await db.prepare(`SELECT * FROM ${table} WHERE id = ?`).bind(entityId).first<Record<string, unknown>>()
  const entityData: Record<string, unknown> = raw ? toCamel(raw) as Record<string, unknown> : {}

  const fieldMap = FIELD_TO_COLUMN[entityType] ?? {}

  // 3. 依次执行各工作流的动作
  for (const row of matched) {
    const { actions } = parseWorkflow(row)
    for (const action of actions) {
      try {
        if (action.type === 'set_field') {
          const col = fieldMap[action.field]
          if (!col) continue
          await db.prepare(`UPDATE ${table} SET ${col} = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
            .bind(action.value, entityId)
            .run()
          // 更新内存副本，让后续动作的插值读到最新值
          entityData[action.field] = action.value

        } else if (action.type === 'webhook') {
          const url  = interpolate(action.url,  entityData)
          const body = interpolate(action.body, entityData)
          await fetch(url, {
            method: action.method ?? 'POST',
            headers: { 'Content-Type': 'application/json' },
            ...(action.method !== 'GET' ? { body } : {}),
          })

        } else if (action.type === 'send_email') {
          const to      = interpolate(action.to,      entityData)
          const subject = interpolate(action.subject,  entityData)
          const body    = interpolate(action.body,     entityData)
          await sendEmail(env, db, to, subject, body)
        }
        // require_activity / require_fields 仅前端约束，后端跳过
      } catch (err) {
        console.error(`[workflow] action ${action.type} failed in workflow ${row.id}:`, err)
      }
    }
  }
}
