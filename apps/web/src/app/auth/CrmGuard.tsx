import { Navigate } from 'react-router-dom'
import { useCrmAuth } from './CrmAuthContext'
import { LoadingSpinner } from '@/shared/components/LoadingSpinner'
import { ReactNode } from 'react'

export function CrmGuard({ children }: { children: ReactNode }) {
  const { user, isLoading } = useCrmAuth()

  if (isLoading) return <LoadingSpinner fullScreen />
  if (!user) return <Navigate to="/app/login" replace />

  return <>{children}</>
}
