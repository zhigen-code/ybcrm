import { useQuery } from '@tanstack/react-query'
import { crmApi } from '@/shared/utils/request'
import i18n from '@/i18n'

export interface ActivityMetaField {
  key: string
  label: string
  type: 'text' | 'number' | 'product_select' | 'date' | 'select'
  unit?: string
  options?: string[]  // select 类型的选项列表
}

export interface ActivityMeta {
  scope?: ('lead' | 'client')[]
  fields?: ActivityMetaField[]
}

export interface OptionItem {
  id: string
  groupKey: string
  value: string
  label: string
  color: 'gray' | 'blue' | 'green' | 'yellow' | 'red' | 'purple'
  sortOrder: number
  isActive: number
  isSystem: number
  metadata?: string | null
}

export function parseActivityMeta(item: OptionItem): ActivityMeta {
  if (!item.metadata) return {}
  try { return JSON.parse(item.metadata) } catch { return {} }
}

type OptionsMap = Record<string, OptionItem[]>

export function useOptions() {
  return useQuery<OptionsMap>({
    queryKey: ['options'],
    queryFn: () =>
      crmApi.get<{ data: OptionsMap }>('/options').then((r) => r.data.data),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  })
}

export function useOptionGroup(groupKey: string) {
  const { data, ...rest } = useOptions()
  return { options: data?.[groupKey] ?? [], ...rest }
}

export function toSelectOptions(items: OptionItem[]) {
  return items.map((i) => ({ value: i.value, label: i.label }))
}

/** 根据 value 查找对应的 color，找不到时返回 'gray' */
export function getOptionColor(items: OptionItem[], value: string): OptionItem['color'] {
  return items.find((o) => o.value === value)?.color ?? 'gray'
}

/** 根据 value 查找对应的 label，有 i18n 翻译时优先返回翻译 */
export function getOptionLabel(items: OptionItem[], value: string): string {
  const item = items.find((o) => o.value === value)
  const label = item?.label ?? value
  const groupKey = item?.groupKey ?? items[0]?.groupKey
  if (!groupKey) return label
  const tKey = `optionValues.${groupKey}.${value}`
  const translated = i18n.t(tKey)
  return translated !== tKey ? translated : label
}
