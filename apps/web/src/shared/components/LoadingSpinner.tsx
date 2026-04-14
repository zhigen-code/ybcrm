import { cn } from '@/shared/utils/cn'

interface Props {
  fullScreen?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function LoadingSpinner({ fullScreen, size = 'md' }: Props) {
  const sizeClass = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' }[size]

  const spinner = (
    <div
      className={cn(
        'animate-spin rounded-full border-2 border-gray-300 border-t-primary-600',
        sizeClass,
      )}
    />
  )

  if (fullScreen) {
    return (
      <div className="flex h-screen items-center justify-center">
        {spinner}
      </div>
    )
  }

  return spinner
}
