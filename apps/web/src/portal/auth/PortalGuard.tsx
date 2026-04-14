import { Navigate } from 'react-router-dom'
import { usePortalAuth } from './PortalAuthContext'
import { LoadingSpinner } from '@/shared/components/LoadingSpinner'
import { ReactNode } from 'react'

export function PortalGuard({ children }: { children: ReactNode }) {
  const { clientUser, isLoading } = usePortalAuth()

  if (isLoading) return <LoadingSpinner fullScreen />
  if (!clientUser) return <Navigate to="/portal/login" replace />

  return <>{children}</>
}
