import { forwardRef, ButtonHTMLAttributes } from 'react'
import { cn } from '@/shared/utils/cn'
import { LoadingSpinner } from './LoadingSpinner'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed',
          {
            'bg-primary-600 text-white hover:bg-primary-700': variant === 'primary',
            'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50': variant === 'secondary',
            'bg-red-600 text-white hover:bg-red-700': variant === 'danger',
            'text-gray-600 hover:bg-gray-100': variant === 'ghost',
          },
          {
            'px-2.5 py-1.5 text-sm': size === 'sm',
            'px-4 py-2 text-sm': size === 'md',
            'px-6 py-3 text-base': size === 'lg',
          },
          className,
        )}
        {...props}
      >
        {loading && <LoadingSpinner size="sm" />}
        {children}
      </button>
    )
  },
)
Button.displayName = 'Button'
