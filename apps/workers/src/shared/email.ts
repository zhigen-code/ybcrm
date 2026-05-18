export async function sendEmail(
  env: Env,
  to: string,
  subject: string,
  body: string,
  opts?: { html?: boolean },
): Promise<void> {
  const fromEmail = env.EMAIL_FROM ?? 'noreply@example.com'
  const fromName  = env.EMAIL_FROM_NAME ?? 'CRM'

  if (env.RESEND_API_KEY) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
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
        from: { email: fromEmail, name: fromName },
        personalizations: [{ to: [{ email: to }], subject }],
        content: [{ type: opts?.html ? 'text/html' : 'text/plain', value: body }],
      }),
    })
  }
}
