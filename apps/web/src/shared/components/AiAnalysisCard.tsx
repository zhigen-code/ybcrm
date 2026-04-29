import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { crmApi } from '@/shared/utils/request'
import { Button } from '@/shared/components/Button'
import { formatDate } from '@/shared/utils/format'
import { useOptionGroup } from '@/shared/hooks/useOptions'

interface AiAction {
  type: string
  label: string
  value: string
  reason: string
}

interface AiAnalysis {
  id: string
  summary: string
  analysis: string
  actionsJson: string
  executedActionsJson: string
  modelDisplayName: string
  createdAt: string
}

function parseActions(json: string): AiAction[] {
  try { return JSON.parse(json) ?? [] } catch { return [] }
}

function parseExecuted(json: string): string[] {
  try { return JSON.parse(json) ?? [] } catch { return [] }
}

// 动作类型图标
const ACTION_ICONS: Record<string, string> = {
  set_next_contact_date:    '📅',
  update_lead_status:       '🔄',
  update_contract_status:   '📋',
  update_intended_services: '🎯',
  update_service_plans:     '🎯',
  create_activity:          '✍️',
  reassign_sales:           '👤',
}

interface Props {
  entityType: 'lead' | 'client'
  entityId: string
  onActionExecuted?: () => void
}

export function AiAnalysisCard({ entityType, entityId, onActionExecuted }: Props) {
  const queryClient = useQueryClient()
  const latestKey = ['ai-analysis-latest', entityType, entityId]
  const { options: activityTypeOpts } = useOptionGroup('activity_type')
  const defaultActivityType = activityTypeOpts[0]?.value ?? ''

  const { data: latest, isLoading: loadingLatest } = useQuery({
    queryKey: latestKey,
    queryFn: () =>
      crmApi.get<{ data: AiAnalysis | null }>(`/${entityType}s/${entityId}/ai-analyses/latest`).then((r) => r.data.data),
    staleTime: 0,
  })

  const analyzeMutation = useMutation({
    mutationFn: () => crmApi.post<{ data: AiAnalysis }>(`/${entityType}s/${entityId}/ai-analyses`).then((r) => r.data.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: latestKey }),
  })

  const markExecuted = useMutation({
    mutationFn: ({ analysisId, actionType }: { analysisId: string; actionType: string }) =>
      crmApi.patch(`/ai-analyses/${analysisId}/execute-action`, { actionType }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: latestKey }),
  })

  // 所有建议操作均通过创建跟进记录实现，保证操作留痕和逻辑统一
  const executeAction = async (analysis: AiAnalysis, action: AiAction) => {
    if (!defaultActivityType) {
      alert('跟进类型尚未加载，请稍候再试')
      return
    }
    try {
      const today = new Date().toISOString().split('T')[0]
      const validValues = new Set(activityTypeOpts.map((o) => o.value))
      const base = { [`${entityType}Id`]: entityId, activityDate: today, activityType: defaultActivityType }

      const ACTION_DESCRIPTIONS: Record<string, string> = {
        update_lead_status:       `AI 建议：更新线索状态为「${action.value}」。${action.reason}`,
        update_contract_status:   `AI 建议：更新合同状态为「${action.value}」。${action.reason}`,
        update_intended_services: `AI 建议：更新意向服务为「${action.value}」。${action.reason}`,
        update_service_plans:     `AI 建议：更新服务套餐为「${action.value}」。${action.reason}`,
        reassign_sales:           `AI 建议：重新分配销售为「${action.value}」。${action.reason}`,
      }

      if (action.type === 'create_activity') {
        let actData: { activityType?: string; description?: string; date?: string } = {}
        try { actData = JSON.parse(action.value) } catch { /* */ }
        const resolvedType = actData.activityType && validValues.has(actData.activityType)
          ? actData.activityType
          : defaultActivityType
        await crmApi.post('/activities', {
          ...base,
          activityType: resolvedType,
          description: actData.description ?? action.reason,
          activityDate: actData.date ?? today,
        })
      } else if (action.type === 'set_next_contact_date') {
        await crmApi.post('/activities', {
          ...base,
          description: `AI 建议：安排下次联系时间为 ${action.value}。${action.reason}`,
          nextContactDate: action.value,
        })
      } else {
        await crmApi.post('/activities', {
          ...base,
          description: ACTION_DESCRIPTIONS[action.type] ?? `AI 建议：${action.label}（${action.value}）。${action.reason}`,
        })
      }

      queryClient.invalidateQueries({ queryKey: ['activities', entityType, entityId] })
      await markExecuted.mutateAsync({ analysisId: analysis.id, actionType: action.type })
      onActionExecuted?.()
    } catch (err) {
      console.error('执行操作失败:', err)
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      alert(msg ? `操作失败：${msg}` : '操作执行失败，请手动处理')
    }
  }

  if (loadingLatest) {
    return (
      <div className="rounded-xl border bg-white p-4">
        <p className="text-sm text-gray-400">加载中...</p>
      </div>
    )
  }

  const actions = latest ? parseActions(latest.actionsJson) : []
  const executed = latest ? parseExecuted(latest.executedActionsJson) : []
  const isAnalyzing = analyzeMutation.isPending

  return (
    <div className="rounded-xl border bg-white overflow-hidden">
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-violet-50 to-white">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-800">AI 分析</span>
          {latest && (
            <span className="text-xs text-gray-400">
              {latest.modelDisplayName} · {formatDate(latest.createdAt)}
            </span>
          )}
        </div>
        <Button
          size="sm"
          variant={latest ? 'secondary' : 'primary'}
          loading={isAnalyzing}
          onClick={() => analyzeMutation.mutate()}
        >
          {isAnalyzing ? '分析中...' : latest ? '重新生成' : '开始分析'}
        </Button>
      </div>

      {analyzeMutation.isError && (
        <div className="px-4 py-3 bg-red-50 text-sm text-red-600">
          {(analyzeMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '分析失败，请检查 AI 模型配置'}
        </div>
      )}

      {isAnalyzing && (
        <div className="px-4 py-8 text-center">
          <div className="inline-flex items-center gap-2 text-sm text-gray-500">
            <svg className="animate-spin h-4 w-4 text-violet-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            正在分析，请稍候...
          </div>
        </div>
      )}

      {!isAnalyzing && latest && (
        <>
          {/* 摘要 */}
          {latest.summary && (
            <div className="px-4 py-2.5 bg-violet-50 border-b">
              <p className="text-sm font-medium text-violet-800">{latest.summary}</p>
            </div>
          )}

          {/* 详细分析 */}
          {latest.analysis && (
            <div className="px-4 py-3 border-b">
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{latest.analysis}</p>
            </div>
          )}

          {/* 建议操作 */}
          {actions.length > 0 && (
            <div className="px-4 py-3">
              <p className="text-xs font-semibold text-gray-500 mb-2">建议操作</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {actions.map((action, i) => {
                  const isDone = executed.includes(action.type)
                  return (
                    <div
                      key={i}
                      className={`rounded-lg border p-3 transition-colors ${
                        isDone ? 'bg-gray-50 border-gray-200 opacity-60' : 'bg-white border-violet-100 hover:border-violet-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <span className="text-sm font-medium text-gray-800">
                          {ACTION_ICONS[action.type] ?? '▶'} {action.label}
                        </span>
                        {isDone && (
                          <span className="text-xs text-green-600 flex-shrink-0">✓ 已执行</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mb-2 leading-relaxed">{action.reason}</p>
                      {!isDone && (
                        <button
                          onClick={() => executeAction(latest, action)}
                          className="text-xs text-violet-600 hover:text-violet-800 font-medium"
                        >
                          执行 →
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      {!isAnalyzing && !latest && (
        <div className="px-4 py-8 text-center text-sm text-gray-400">
          点击「开始分析」生成 AI 分析报告
        </div>
      )}
    </div>
  )
}
