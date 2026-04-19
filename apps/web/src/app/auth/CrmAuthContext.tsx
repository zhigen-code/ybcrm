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
const USER_KEY = 'crm_user'

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]!))
    return typeof payload.exp === 'number' && payload.exp * 1000 < Date.now()
  } catch {
    return true
  }
}

function initFromStorage(): { token: string | null; user: User | null } {
  const token = localStorage.getItem(TOKEN_KEY)
  if (!token || isTokenExpired(token)) {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    return { token: null, user: null }
  }
  try {
    const raw = localStorage.getItem(USER_KEY)
    return { token, user: raw ? (JSON.parse(raw) as User) : null }
  } catch {
    return { token, user: null }
  }
}

export function CrmAuthProvider({ children }: { children: ReactNode }) {
  const [{ token: initialToken, user: initialUser }] = useState(initFromStorage)
  const [token, setToken] = useState<string | null>(initialToken)
  const [user, setUser] = useState<User | null>(initialUser)
  // isLoading 仅在有 token 但本地无缓存用户时才为 true（极少发生）
  const [isLoading, setIsLoading] = useState(!!initialToken && !initialUser)

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setToken(null)
    setUser(null)
  }, [])

  useEffect(() => {
    attachTokenInterceptor(crmApi, () => localStorage.getItem(TOKEN_KEY), logout)
  }, [logout])

  // 后台静默刷新，不阻塞渲染
  useEffect(() => {
    if (!token) return
    crmApi
      .get<{ data: User }>('/auth/me')
      .then((res) => {
        const fresh = res.data.data
        setUser(fresh)
        localStorage.setItem(USER_KEY, JSON.stringify(fresh))
      })
      .catch(() => logout())
      .finally(() => setIsLoading(false))
  }, [token, logout])

  const updateUser = useCallback((partial: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev
      const updated = { ...prev, ...partial }
      localStorage.setItem(USER_KEY, JSON.stringify(updated))
      return updated
    })
  }, [])

  const login = async (email: string, password: string) => {
    const res = await crmApi.post<{ data: { token: string; user: User } }>('/auth/login', {
      email,
      password,
    })
    const { token: newToken, user: newUser } = res.data.data
    localStorage.setItem(TOKEN_KEY, newToken)
    localStorage.setItem(USER_KEY, JSON.stringify(newUser))
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
