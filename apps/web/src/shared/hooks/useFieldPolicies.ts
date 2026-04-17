import { useQuery } from '@tanstack/react-query'
import { crmApi } from '@/shared/utils/request'

export interface PolicyRequiredField {
  field: string
  label: string
  type: 'select' | 'datetime' | 'services'
  optionGroup?: string
}

export interface FieldPolicyConfig {
  requireActivity: boolean
  activityContentRequired?: boolean
  contentPresets?: string[]
  requiredFields?: PolicyRequiredField[]
}

export interface FieldPolicy {
  id: string
  entityType: string
  triggerField: string
  triggerValue: string
  policyConfig: FieldPolicyConfig
  isActive: number
}

export function useFieldPolicies(entityType: string) {
  const { data, ...rest } = useQuery<FieldPolicy[]>({
    queryKey: ['field-policies', entityType],
    queryFn: () =>
      crmApi
        .get<{ data: FieldPolicy[] }>('/field-policies', { params: { entityType } })
        .then((r) => r.data.data),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  })

  const getPolicy = (field: string, value: string): FieldPolicyConfig | null => {
    if (!data) return null
    return data.find((p) => p.triggerField === field && p.triggerValue === value)?.policyConfig ?? null
  }

  return { policies: data ?? [], getPolicy, ...rest }
}
