import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'

let _timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

export function setAppTimezone(tz: string) {
  _timezone = tz
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: _timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(date)).replace(/\//g, '-')
}

export function formatRelativeTime(date: string | Date) {
  return formatDistanceToNow(new Date(date), { locale: zhCN, addSuffix: true })
}

// 返回当前时间在 app 时区下的 datetime-local 输入值（yyyy-MM-ddTHH:mm）
export function nowForInput() {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: _timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date()).replace(' ', 'T')
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
