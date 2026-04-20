import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { portalApi, attachTokenInterceptor } from '@/shared/utils/request'
import type { ClientUser } from '@/shared/types'

interface PortalAuthState {
  clientUser: ClientUser | null
  token: string | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  sendMagicLink: (email: string) => Promise<void>
  verifyMagicLink: (token: string) => Promise<void>
  logout: () => void
}

const PortalAuthContext = createContext<PortalAuthState | null>(null)

const TOKEN_KEY = 'portal_token'
const USER_KEY = 'portal_user'

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]!))
    return typeof payload.exp === 'number' && payload.exp * 1000 < Date.now()
  } catch {
    return true
  }
}

function initFromStorage(): { token: string | null; clientUser: ClientUser | null } {
  const token = localStorage.getItem(TOKEN_KEY)
  if (!token || isTokenExpired(token)) {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    return { token: null, clientUser: null }
  }
  try {
    const raw = localStorage.getItem(USER_KEY)
    return { token, clientUser: raw ? (JSON.parse(raw) as ClientUser) : null }
  } catch {
    return { token, clientUser: null }
  }
}

export function PortalAuthProvider({ children }: { children: ReactNode }) {
  const [{ token: initialToken, clientUser: initialUser }] = useState(initFromStorage)
  const [token, setToken] = useState<string | null>(initialToken)
  const [clientUser, setClientUser] = useState<ClientUser | null>(initialUser)
  const [isLoading, setIsLoading] = useState(!!initialToken && !initialUser)

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setToken(null)
    setClientUser(null)
  }, [])

  useEffect(() => {
    window.addEventListener('portal:unauthorized', logout)
    return () => window.removeEventListener('portal:unauthorized', logout)
  }, [logout])

  // 后台静默刷新，不阻塞渲染
  useEffect(() => {
    if (!token) return
    portalApi
      .get<{ data: ClientUser }>('/auth/me')
      .then((res) => {
        const fresh = res.data.data
        setClientUser(fresh)
        localStorage.setItem(USER_KEY, JSON.stringify(fresh))
      })
      .catch(() => logout())
      .finally(() => setIsLoading(false))
  }, [token, logout])

  const login = async (email: string, password: string) => {
    const res = await portalApi.post<{ data: { token: string; clientUser: ClientUser } }>(
      '/auth/login',
      { email, password },
    )
    const { token: newToken, clientUser: newUser } = res.data.data
    localStorage.setItem(TOKEN_KEY, newToken)
    localStorage.setItem(USER_KEY, JSON.stringify(newUser))
    setToken(newToken)
    setClientUser(newUser)
  }

  const sendMagicLink = async (email: string) => {
    await portalApi.post('/auth/magiclink', { email })
  }

  const verifyMagicLink = async (magicToken: string) => {
    const res = await portalApi.post<{ data: { token: string; clientUser: ClientUser } }>(
      '/auth/magiclink/verify',
      { token: magicToken },
    )
    const { token: newToken, clientUser: newUser } = res.data.data
    localStorage.setItem(TOKEN_KEY, newToken)
    localStorage.setItem(USER_KEY, JSON.stringify(newUser))
    setToken(newToken)
    setClientUser(newUser)
  }

  return (
    <PortalAuthContext.Provider
      value={{ clientUser, token, isLoading, login, sendMagicLink, verifyMagicLink, logout }}
    >
      {children}
    </PortalAuthContext.Provider>
  )
}

export function usePortalAuth() {
  const ctx = useContext(PortalAuthContext)
  if (!ctx) throw new Error('usePortalAuth must be used within PortalAuthProvider')
  return ctx
}
