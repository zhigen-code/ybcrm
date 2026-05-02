const FROM_EMAIL = 'noreply@irfc.cn'
const FROM_NAME = '辅助生殖 CRM'

export async function sendEmail(
  env: Env,
  to: string,
  subject: string,
  body: string,
  opts?: { html?: boolean },
): Promise<void> {
  if (env.RESEND_API_KEY) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [to],
        subject,
        ...(opts?.html ? { html: body } : { text: body }),
      }),
    })
    return
  }

  if (env.SENDGRID_API_KEY) {
    await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.SENDGRID_API_KEY}`,
      },
      body: JSON.stringify({
        from: { email: FROM_EMAIL, name: FROM_NAME },
        personalizations: [{ to: [{ email: to }], subject }],
        content: [{ type: opts?.html ? 'text/html' : 'text/plain', value: body }],
      }),
    })
  }
}
