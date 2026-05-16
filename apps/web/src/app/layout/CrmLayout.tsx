import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useCrmAuth } from '@/app/auth/CrmAuthContext'
import { Button } from '@/shared/components/Button'
import { cn } from '@/shared/utils/cn'
import { crmApi } from '@/shared/utils/request'
import { setAppTimezone } from '@/shared/utils/format'
import { AiAgentChat } from '@/shared/components/AiAgentChat'

export default function CrmLayout() {
  const { t, i18n } = useTranslation()
  const { user, logout } = useCrmAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navItems = [
    { to: '/app/leads', label: t('nav.leads') },
    { to: '/app/clients', label: t('nav.clients') },
    { to: '/app/activities', label: t('nav.activities') },
    { to: '/app/products', label: t('nav.products'), roles: ['admin', 'operations'] },
  ]

  const adminNavItems = [
    { to: '/app/users', label: t('nav.users') },
    { to: '/app/settings', label: t('nav.settings') },
  ]

  const { data: newLeadsData } = useQuery({
    queryKey: ['leads-new-count'],
    queryFn: () =>
      crmApi.get<{ total: number }>('/leads', { params: { status: 'New', pageSize: 1 } })
        .then((r) => r.data.total),
    refetchInterval: 10_000,
    staleTime: 0,
  })

  const handleLogout = () => {
    logout()
    navigate('/app/login')
  }

  const toggleLang = () => {
    const next = i18n.language === 'zh' ? 'en' : 'zh'
    i18n.changeLanguage(next)
  }

  const { data: publicSettings } = useQuery({
    queryKey: ['public-settings'],
    queryFn: () => crmApi.get<{ data: { systemName: string; timezone: string; aiAgentEnabled: boolean } }>('/public/settings').then((r) => r.data.data),
    staleTime: 1000 * 60 * 60,
  })
  const systemName = publicSettings?.systemName ?? 'CRM'
  useEffect(() => { document.title = systemName }, [systemName])
  useEffect(() => {
    if (publicSettings?.timezone) setAppTimezone(publicSettings.timezone)
  }, [publicSettings?.timezone])

  const docsItem = { to: '/app/docs', label: t('nav.docs') }
  const filteredNavItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(user?.role ?? ''),
  )
  const allNavItems =
    user?.role === 'admin'
      ? [...filteredNavItems, ...adminNavItems, docsItem]
      : [...filteredNavItems, docsItem]

  const Sidebar = ({ onNavClick }: { onNavClick?: () => void }) => (
    <>
      <div className="flex h-14 items-center px-4 border-b">
        <span className="font-bold text-gray-900">{systemName}</span>
      </div>
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {allNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavClick}
            className={({ isActive }) =>
              cn(
                'flex items-center justify-between rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
              )
            }
          >
            {item.label}
            {item.to === '/app/leads' && newLeadsData != null && newLeadsData > 0 && (
              <span className="ml-1.5 flex-shrink-0 rounded-full bg-red-400 text-white min-w-[14px] h-3.5 flex items-center justify-center px-1" style={{ fontSize: '9px', lineHeight: 1 }}>
                {newLeadsData > 99 ? '99+' : newLeadsData}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="border-t p-3 space-y-0.5">
        <NavLink
          to="/app/profile"
          onClick={onNavClick}
          className={({ isActive }) =>
            cn(
              'flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary-50 text-primary-700'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
            )
          }
        >
          {user?.name}
          <span className="ml-1.5 text-xs font-normal text-gray-400">· {user?.role}</span>
        </NavLink>
        <button
          type="button"
          onClick={toggleLang}
          className="w-full flex items-center rounded-md px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
        >
          <span className="mr-2 text-base">{i18n.language === 'zh' ? '🌐' : '🌐'}</span>
          {i18n.language === 'zh' ? 'English' : '中文'}
        </button>
        <Button variant="ghost" size="sm" className="w-full justify-start" onClick={handleLogout}>
          {t('nav.logout')}
        </Button>
      </div>
    </>
  )

  return (
    <div className="flex h-screen bg-gray-100">
      {/* mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 flex h-14 items-center justify-between bg-white px-4 shadow-sm">
        <span className="font-bold text-gray-900">{systemName}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleLang}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 text-sm font-medium"
          >
            {i18n.language === 'zh' ? 'EN' : '中'}
          </button>
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'md:hidden fixed left-0 top-0 bottom-0 z-50 flex w-64 flex-col bg-white shadow-xl transition-transform duration-300',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <Sidebar onNavClick={() => setSidebarOpen(false)} />
      </aside>

      <aside className="hidden md:flex w-56 flex-col bg-white shadow-sm flex-shrink-0">
        <Sidebar />
      </aside>

      <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
        <Outlet />
      </main>

      {publicSettings?.aiAgentEnabled !== false && <AiAgentChat />}
    </div>
  )
}
