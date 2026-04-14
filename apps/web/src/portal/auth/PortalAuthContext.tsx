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

export function PortalAuthProvider({ children }: { children: ReactNode }) {
  const [clientUser, setClientUser] = useState<ClientUser | null>(null)
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [isLoading, setIsLoading] = useState(true)

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setClientUser(null)
  }, [])

  useEffect(() => {
    attachTokenInterceptor(portalApi, () => localStorage.getItem(TOKEN_KEY), logout)
  }, [logout])

  useEffect(() => {
    if (!token) {
      setIsLoading(false)
      return
    }
    portalApi
      .get<{ data: ClientUser }>('/auth/me')
      .then((res) => setClientUser(res.data.data))
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
