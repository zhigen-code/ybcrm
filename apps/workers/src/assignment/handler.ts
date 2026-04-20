interface Lead {
  id: string
  intended_services: string
  assigned_to_userId: string | null
}

interface SalesUser {
  id: string
  team_id: string | null
  capacity: number
  specialization: string
  current_leads_count: number
}

interface AssignmentRule {
  rule_type: 'round_robin' | 'load_balance' | 'skill_match' | 'region_match'
  priority: number
  config_json: string
}

export async function handleLeadAssignmentBatch(
  batch: MessageBatch<{ leadId: string }>,
  env: Env,
): Promise<void> {
  for (const message of batch.messages) {
    try {
      await assignLead(message.body.leadId, env)
      message.ack()
    } catch (err) {
      console.error(`分配线索 ${message.body.leadId} 失败:`, err)
      message.retry()
    }
  }
}

async function assignLead(leadId: string, env: Env): Promise<void> {
  // 检查全局自动分配开关
  const setting = await env.DB.prepare(
    "SELECT value FROM system_settings WHERE key = 'auto_assign_enabled'",
  ).first<{ value: string }>()
  if (setting?.value === 'false') {
    console.log('自动分配已关闭，跳过线索分配')
    return
  }

  const lead = await env.DB.prepare(
    'SELECT * FROM leads WHERE id = ? AND assigned_to_userId IS NULL',
  ).bind(leadId).first<Lead>()

  if (!lead) return // 已分配或不存在

  const salesUsers = await env.DB.prepare(
    `SELECT id, team_id, capacity, specialization, current_leads_count
     FROM users
     WHERE role = 'sales' AND is_active = 1 AND current_leads_count < capacity
     ORDER BY current_leads_count ASC`,
  ).all<SalesUser>()

  if (!salesUsers.results.length) {
    console.warn(`无可用销售人员，线索 ${leadId} 暂不分配`)
    return
  }

  const rules = await env.DB.prepare(
    'SELECT rule_type, priority, config_json FROM assignment_rules WHERE is_active = 1 ORDER BY priority ASC',
  ).all<AssignmentRule>()

  let assignedUser: SalesUser | null = null

  for (const rule of rules.results) {
    const candidate = applyRule(rule, lead, salesUsers.results)
    if (candidate) { assignedUser = candidate; break }
  }

  // 降级：取负载最低的
  assignedUser ??= salesUsers.results[0] ?? null
  if (!assignedUser) return

  await env.DB.prepare(
    `UPDATE leads SET assigned_to_userId = ?, assigned_to_teamId = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
  ).bind(assignedUser.id, assignedUser.team_id, leadId).run()

  await env.DB.prepare(
    'UPDATE users SET current_leads_count = current_leads_count + 1 WHERE id = ?',
  ).bind(assignedUser.id).run()

  await env.NOTIFICATION_QUEUE.send({ type: 'lead_assigned', leadId, assignedToUserId: assignedUser.id })

  console.log(`线索 ${leadId} 已分配给 ${assignedUser.id}`)
}

function applyRule(rule: AssignmentRule, lead: Lead, users: SalesUser[]): SalesUser | null {
  switch (rule.rule_type) {
    case 'skill_match': {
      const matched = users.filter((u) => {
        const skills: string[] = JSON.parse(u.specialization || '[]')
        const leadServices: string[] = JSON.parse(lead.intended_services || '[]')
        return leadServices.some((s) => skills.includes(s))
      })
      return matched.sort((a, b) => a.current_leads_count - b.current_leads_count)[0] ?? null
    }
    case 'load_balance':
    case 'round_robin':
      return users[0] ?? null
    default:
      return null
  }
}
