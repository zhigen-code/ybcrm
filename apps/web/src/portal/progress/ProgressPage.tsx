import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { portalApi } from '@/shared/utils/request'
import { formatDate } from '@/shared/utils/format'

interface Milestone {
  id: string
  serviceId: string
  serviceName: string
  stepIndex: number
  stepName: string
  status: 'pending' | 'in_progress' | 'completed' | 'skipped'
  expectedDate: string | null
  completedDate: string | null
  notes: string | null
}

const STATUS_CONFIG = {
  pending:     { bg: 'bg-gray-200',    ring: '',                    label: 'milestone.pending' },
  in_progress: { bg: 'bg-primary-500', ring: 'ring-4 ring-primary-100', label: 'milestone.inProgress' },
  completed:   { bg: 'bg-green-500',   ring: '',                    label: 'milestone.completed' },
  skipped:     { bg: 'bg-gray-300',    ring: '',                    label: 'milestone.skipped' },
}

export default function PortalProgressPage() {
  const { t } = useTranslation()

  const { data, isLoading } = useQuery({
    queryKey: ['portal', 'milestones'],
    queryFn: () => portalApi.get<{ data: Milestone[] }>('/milestones').then((r) => r.data.data),
  })

  const milestones = data ?? []

  // 按服务分组
  const byService: Record<string, { name: string; items: Milestone[] }> = {}
  for (const m of milestones) {
    if (!byService[m.serviceId]) byService[m.serviceId] = { name: m.serviceName, items: [] }
    byService[m.serviceId]!.items.push(m)
  }

  if (isLoading) return (
    <div className="flex items-center justify-center py-20 text-sm text-gray-400">
      {t('common.loading')}
    </div>
  )

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">{t('portal.progress.title')}</h1>

      {milestones.length === 0 ? (
        <div className="rounded-xl border bg-white p-12 text-center text-sm text-gray-500">
          {t('portal.progress.empty')}
        </div>
      ) : (
        <div className="space-y-8">
          {Object.values(byService).map(({ name, items }) => {
            const completed = items.filter((m) => m.status === 'completed').length
            const pct = Math.round((completed / items.length) * 100)

            return (
              <div key={name}>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-base font-semibold text-gray-800">{name}</h2>
                  <span className="text-sm text-gray-400">{completed}/{items.length}</span>
                </div>

                {/* 进度条 */}
                <div className="h-2 bg-gray-100 rounded-full mb-6 overflow-hidden">
                  <div
                    className="h-full bg-primary-500 rounded-full transition-all duration-700"
                    style={{ width: `${pct}%` }}
                  />
                </div>

                {/* 时间线 */}
                <div className="relative">
                  {/* 垂直连接线 */}
                  <div className="absolute left-3.5 top-6 bottom-6 w-0.5 bg-gray-200" />

                  <div className="space-y-4">
                    {items.map((m) => {
                      const cfg = STATUS_CONFIG[m.status]
                      return (
                        <div key={m.id} className="relative flex gap-4">
                          {/* 步骤圆点 */}
                          <div className={`relative z-10 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold ${cfg.bg} ${cfg.ring}`}>
                            {m.status === 'completed' ? (
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              m.stepIndex + 1
                            )}
                          </div>

                          {/* 内容 */}
                          <div className={`flex-1 pb-1 ${m.status === 'skipped' ? 'opacity-40' : ''}`}>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-sm font-medium ${m.status === 'skipped' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                                {m.stepName}
                              </span>
                              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                                m.status === 'completed' ? 'bg-green-50 text-green-700' :
                                m.status === 'in_progress' ? 'bg-primary-50 text-primary-700' :
                                'bg-gray-100 text-gray-400'
                              }`}>
                                {t(cfg.label)}
                              </span>
                            </div>
                            {m.completedDate && (
                              <p className="text-xs text-gray-400 mt-0.5">{t('milestone.completedOn')} {formatDate(m.completedDate)}</p>
                            )}
                            {m.expectedDate && !m.completedDate && (
                              <p className="text-xs text-gray-400 mt-0.5">{t('milestone.expectedOn')} {formatDate(m.expectedDate)}</p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
