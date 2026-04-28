interface NotificationMessage {
  type: 'lead_assigned'
  leadId: string
  assignedToUserId: string
}

interface NotificationConfig {
  emailEnabled: boolean
  email: string
  webhookEnabled: boolean
  webhookUrl: string
}

export async function handleNotificationBatch(
  batch: MessageBatch<NotificationMessage>,
  env: Env,
): Promise<void> {
  for (const message of batch.messages) {
    try {
      await processNotification(message.body, env)
      message.ack()
    } catch (err) {
      console.error('[notification] 处理失败:', err)
      message.retry()
    }
  }
}

async function processNotification(msg: NotificationMessage, env: Env): Promise<void> {
  if (msg.type !== 'lead_assigned') return

  const user = await env.DB.prepare(
    'SELECT name, email, notification_config FROM users WHERE id = ?',
  ).bind(msg.assignedToUserId).first<{ name: string; email: string; notification_config: string | null }>()
  if (!user) return

  let config: NotificationConfig = { emailEnabled: false, email: user.email, webhookEnabled: false, webhookUrl: '' }
  if (user.notification_config) {
    try { config = { ...config, ...JSON.parse(user.notification_config) } } catch { /* keep default */ }
  }

  if (!config.emailEnabled && !config.webhookEnabled) return

  const lead = await env.DB.prepare(
    'SELECT name, contact_info, source, lead_no FROM leads WHERE id = ?',
  ).bind(msg.leadId).first<{ name: string; contact_info: string; source: string; lead_no: number | null }>()
  if (!lead) return

  const leadNo = lead.lead_no != null ? `L-${String(lead.lead_no).padStart(4, '0')} ` : ''
  const subject = `新线索已分配给你：${leadNo}${lead.name}`
  const body = `你好 ${user.name}，\n\n以下线索已分配给你，请及时跟进：\n\n姓名：${lead.name}\n联系方式：${lead.contact_info}\n来源：${lead.source ?? '未知'}\n\n请登录 CRM 查看详情。`

  const webhookPayload = {
    event: 'lead_assigned',
    leadId: msg.leadId,
    leadNo: lead.lead_no,
    leadName: lead.name,
    contactInfo: lead.contact_info,
    source: lead.source,
    assigneeName: user.name,
    assigneeEmail: user.email,
  }

  await Promise.allSettled([
    config.emailEnabled && config.email
      ? sendEmail(env, config.email, subject, body)
      : Promise.resolve(),
    config.webhookEnabled && config.webhookUrl
      ? sendWebhook(config.webhookUrl, webhookPayload)
      : Promise.resolve(),
  ])
}

async function sendEmail(env: Env, to: string, subject: string, body: string): Promise<void> {
  if (!env.SENDGRID_API_KEY) return
  await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.SENDGRID_API_KEY}`,
    },
    body: JSON.stringify({
      from: { email: 'noreply@irfc.cn', name: '辅助生殖 CRM' },
      personalizations: [{ to: [{ email: to }], subject }],
      content: [{ type: 'text/plain', value: body }],
    }),
  })
}

async function sendWebhook(url: string, payload: object): Promise<void> {
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}
