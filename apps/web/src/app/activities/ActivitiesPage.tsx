import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { crmApi } from '@/shared/utils/request'
import { Badge } from '@/shared/components/Badge'
import { formatDate } from '@/shared/utils/format'
import type { SalesActivity } from '@/shared/types'

const typeConfig: Record<string, { label: string; variant: 'blue' | 'green' | 'yellow' | 'gray' }> = {
  Call:    { label: '电话', variant: 'blue' },
  Meeting: { label: '会面', variant: 'green' },
  Email:   { label: '邮件', variant: 'yellow' },
  Note:    { label: '备注', variant: 'gray' },
}

function RelatedLink({ act }: { act: SalesActivity }) {
  if (act.clientId) return <Link to={`/app/clients/${act.clientId}`} className="text-primary-600 hover:underline">客户</Link>
  if (act.leadId) return <Link to={`/app/leads/${act.leadId}`} className="text-primary-600 hover:underline">线索</Link>
  return <span>—</span>
}

export default function ActivitiesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['activities'],
    queryFn: () => crmApi.get<{ data: SalesActivity[] }>('/activities').then((r) => r.data),
  })

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl font-semibold text-gray-900">销售活动</h1>
        <p className="mt-0.5 text-sm text-gray-500">所有跟进记录汇总</p>
      </div>

      {isLoading ? (
        <div className="text-sm text-gray-500">加载中...</div>
      ) : !data?.data.length ? (
        <div className="py-12 text-center text-sm text-gray-500">暂无活动记录</div>
      ) : (
        <>
          {/* 移动端：卡片列表 */}
          <div className="space-y-3 sm:hidden">
            {data.data.map((act) => {
              const cfg = typeConfig[act.activityType] ?? typeConfig['Note']!
              return (
                <div key={act.id} className="rounded-lg border bg-white p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant={cfg.variant}>{cfg.label}</Badge>
                    <span className="text-xs text-gray-400">{formatDate(act.activityDate)}</span>
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-3 mb-2">
                    {act.description ?? '—'}
                  </p>
                  <div className="text-xs text-gray-500">
                    关联：<RelatedLink act={act} />
                  </div>
                </div>
              )
            })}
          </div>

          {/* 桌面端：表格 */}
          <div className="hidden sm:block rounded-lg border bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">类型</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">内容</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">关联对象</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.data.map((act) => {
                  const cfg = typeConfig[act.activityType] ?? typeConfig['Note']!
                  return (
                    <tr key={act.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Badge variant={cfg.variant}>{cfg.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-700 max-w-xs truncate">
                        {act.description ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        <RelatedLink act={act} />
                      </td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(act.activityDate)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
