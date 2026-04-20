import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import { verifyJwt, type CrmJwtPayload } from '../../shared/jwt'

declare module 'hono' {
  interface ContextVariableMap {
    jwtPayload: CrmJwtPayload
  }
}

export const requireAuth = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw new HTTPException(401, { message: '未授权' })
  }
  const token = authHeader.slice(7)
  try {
    const payload = await verifyJwt<CrmJwtPayload>(token, c.env.JWT_SECRET)
    c.set('jwtPayload', payload)
  } catch {
    throw new HTTPException(401, { message: 'Token 无效或已过期' })
  }
  await next()
})

export const requireAdmin = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  if (c.get('jwtPayload').role !== 'admin') {
    throw new HTTPException(403, { message: '权限不足' })
  }
  await next()
})

export const requireNotSales = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  if (c.get('jwtPayload').role === 'sales') {
    throw new HTTPException(403, { message: '权限不足' })
  }
  await next()
})
