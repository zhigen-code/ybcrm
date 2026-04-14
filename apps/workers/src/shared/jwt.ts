import { SignJWT, jwtVerify } from 'jose'

export interface CrmJwtPayload {
  userId: string
  role: 'admin' | 'operations' | 'sales'
  teamId: string | null
  exp: number
}

export interface PortalJwtPayload {
  clientUserId: string
  clientId: string
  exp: number
}

export async function signCrmJwt(
  payload: Omit<CrmJwtPayload, 'exp'>,
  secret: string,
  expiresIn = '8h',
): Promise<string> {
  const key = new TextEncoder().encode(secret)
  return new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(key)
}

export async function signPortalJwt(
  payload: Omit<PortalJwtPayload, 'exp'>,
  secret: string,
  expiresIn = '7d',
): Promise<string> {
  const key = new TextEncoder().encode(secret)
  return new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(key)
}

export async function verifyJwt<T>(token: string, secret: string): Promise<T> {
  const key = new TextEncoder().encode(secret)
  const { payload } = await jwtVerify(token, key)
  return payload as unknown as T
}
