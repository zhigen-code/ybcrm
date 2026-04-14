import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export const requireApiKey = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const apiKey = c.req.header('X-API-Key')
  if (!apiKey?.startsWith('crm_')) {
    throw new HTTPException(401, { message: '缺少有效的 X-API-Key 请求头' })
  }

  const hash = await sha256Hex(apiKey)

  const row = await c.env.DB.prepare(
    `SELECT ak.id, ak.user_id, u.role, u.team_id
     FROM api_keys ak JOIN users u ON ak.user_id = u.id
     WHERE ak.key_hash = ?`,
  ).bind(hash).first<{ id: string; user_id: string; role: string; team_id: string | null }>()

  if (!row) throw new HTTPException(401, { message: 'API Key 无效' })

  // 异步更新最后使用时间（不阻塞请求）
  void c.env.DB.prepare('UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?')
    .bind(row.id).run()

  c.set('jwtPayload', {
    userId: row.user_id,
    role: row.role as 'admin' | 'operations' | 'sales',
    teamId: row.team_id,
    exp: 0,
  })
  await next()
})
