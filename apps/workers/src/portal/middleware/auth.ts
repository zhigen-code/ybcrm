import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import { verifyJwt, type PortalJwtPayload } from '../../shared/jwt'

declare module 'hono' {
  interface ContextVariableMap {
    portalPayload: PortalJwtPayload
  }
}

export const requirePortalAuth = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw new HTTPException(401, { message: '未授权' })
  }
  const token = authHeader.slice(7)
  try {
    const payload = await verifyJwt<PortalJwtPayload>(token, c.env.PORTAL_JWT_SECRET)
    c.set('portalPayload', payload)
  } catch {
    throw new HTTPException(401, { message: 'Token 无效或已过期' })
  }
  await next()
})
