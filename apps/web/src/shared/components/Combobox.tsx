import { forwardRef, useState, useRef, useEffect, useId } from 'react'
import { cn } from '@/shared/utils/cn'

interface Props {
  label?: string
  error?: string | undefined
  value: string
  onChange: (value: string) => void
  options: string[]
  placeholder?: string
  disabled?: boolean
}

/**
 * Combobox：可自由输入 + 从已有选项中选择
 * - 输入时实时过滤匹配项
 * - 选中选项后直接填入输入框
 * - 不匹配时也可保留自定义输入值
 */
export const Combobox = forwardRef<HTMLInputElement, Props>(
  ({ label, error, value, onChange, options, placeholder, disabled }, ref) => {
    const id = useId()
    const [open, setOpen] = useState(false)
    const [inputVal, setInputVal] = useState(value)
    const containerRef = useRef<HTMLDivElement>(null)
    const listRef = useRef<HTMLUListElement>(null)
    const [activeIdx, setActiveIdx] = useState(-1)

    // 同步外部 value 变化（如 reset()）
    useEffect(() => {
      setInputVal(value)
    }, [value])

    // 点击外部关闭
    useEffect(() => {
      if (!open) return
      const handle = (e: MouseEvent) => {
        if (!containerRef.current?.contains(e.target as Node)) {
          setOpen(false)
          setActiveIdx(-1)
        }
      }
      document.addEventListener('mousedown', handle)
      return () => document.removeEventListener('mousedown', handle)
    }, [open])

    const filtered = options.filter((o) =>
      o.toLowerCase().includes(inputVal.toLowerCase()),
    )

    const select = (opt: string) => {
      setInputVal(opt)
      onChange(opt)
      setOpen(false)
      setActiveIdx(-1)
    }

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value
      setInputVal(v)
      onChange(v)
      setOpen(true)
      setActiveIdx(-1)
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!open) {
        if (e.key === 'ArrowDown' || e.key === 'Enter') setOpen(true)
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIdx((i) => Math.min(i + 1, filtered.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIdx((i) => Math.max(i - 1, -1))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (activeIdx >= 0 && filtered[activeIdx]) {
          select(filtered[activeIdx])
        } else {
          setOpen(false)
        }
      } else if (e.key === 'Escape') {
        setOpen(false)
        setActiveIdx(-1)
      }
    }

    return (
      <div ref={containerRef} className="relative flex flex-col gap-1">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          value={inputVal}
          onChange={handleInput}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          className={cn(
            'rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-gray-50 disabled:text-gray-500',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
          )}
        />
        {error && <p className="text-xs text-red-600">{error}</p>}

        {open && filtered.length > 0 && (
          <ul
            ref={listRef}
            className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg"
          >
            {filtered.map((opt, idx) => (
              <li
                key={opt}
                onMouseDown={(e) => {
                  e.preventDefault() // 防止 input 失焦
                  select(opt)
                }}
                onMouseEnter={() => setActiveIdx(idx)}
                className={cn(
                  'cursor-pointer px-3 py-2 text-sm',
                  idx === activeIdx
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-700 hover:bg-gray-50',
                )}
              >
                {opt}
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  },
)
Combobox.displayName = 'Combobox'
