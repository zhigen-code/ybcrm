import { forwardRef, SelectHTMLAttributes } from 'react'
import { cn } from '@/shared/utils/cn'

interface Option {
  value: string
  label: string
}

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string | undefined
  options: Option[]
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, Props>(
  ({ className, label, error, id, options, placeholder, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={id}
          className={cn(
            'rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-gray-50',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
            className,
          )}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    )
  },
)
Select.displayName = 'Select'
