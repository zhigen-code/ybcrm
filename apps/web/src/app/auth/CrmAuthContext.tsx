import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { crmApi, attachTokenInterceptor } from '@/shared/utils/request'
import type { User } from '@/shared/types'

interface CrmAuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  updateUser: (partial: Partial<User>) => void
}

const CrmAuthContext = createContext<CrmAuthState | null>(null)

const TOKEN_KEY = 'crm_token'

export function CrmAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [isLoading, setIsLoading] = useState(true)

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUser(null)
  }, [])

  useEffect(() => {
    attachTokenInterceptor(crmApi, () => localStorage.getItem(TOKEN_KEY), logout)
  }, [logout])

  useEffect(() => {
    if (!token) {
      setIsLoading(false)
      return
    }
    crmApi
      .get<{ data: User }>('/auth/me')
      .then((res) => setUser(res.data.data))
      .catch(() => logout())
      .finally(() => setIsLoading(false))
  }, [token, logout])

  const updateUser = useCallback((partial: Partial<User>) => {
    setUser((prev) => prev ? { ...prev, ...partial } : prev)
  }, [])

  const login = async (email: string, password: string) => {
    const res = await crmApi.post<{ data: { token: string; user: User } }>('/auth/login', {
      email,
      password,
    })
    const { token: newToken, user: newUser } = res.data.data
    localStorage.setItem(TOKEN_KEY, newToken)
    setToken(newToken)
    setUser(newUser)
  }

  return (
    <CrmAuthContext.Provider value={{ user, token, isLoading, login, logout, updateUser }}>
      {children}
    </CrmAuthContext.Provider>
  )
}

export function useCrmAuth() {
  const ctx = useContext(CrmAuthContext)
  if (!ctx) throw new Error('useCrmAuth must be used within CrmAuthProvider')
  return ctx
}
