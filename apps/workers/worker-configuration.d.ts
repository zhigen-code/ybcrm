interface Env {
  // Cloudflare 资源绑定
  DB: D1Database
  STORAGE: R2Bucket
  LEAD_ASSIGNMENT_QUEUE: Queue
  NOTIFICATION_QUEUE: Queue

  // Secrets（通过 wrangler secret put 管理，不写入 wrangler.toml）
  JWT_SECRET: string          // CRM 内部员工认证
  PORTAL_JWT_SECRET: string   // 客户门户认证，独立 secret
  SENDGRID_API_KEY: string    // 邮件发送
  PORTAL_BASE_URL: string     // Magic Link 基础 URL

  // Vars
  ENVIRONMENT: string
}
