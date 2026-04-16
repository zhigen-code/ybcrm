import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { crmApi } from '@/shared/utils/request'
import { Badge } from '@/shared/components/Badge'
import { Input } from '@/shared/components/Input'
import { Button } from '@/shared/components/Button'
import { AttachmentList } from '@/shared/components/AttachmentList'
import { Pagination } from '@/shared/components/Pagination'
import { formatDate } from '@/shared/utils/format'
import type { SalesActivity } from '@/shared/types'

const typeConfig: Record<string, { label: string; variant: 'blue' | 'green' | 'yellow' | 'gray' }> = {
  Call:    { label: '电话', variant: 'blue' },
  Meeting: { label: '会面', variant: 'green' },
  Email:   { label: '邮件', variant: 'yellow' },
  Note:    { label: '备注', variant: 'gray' },
}

const PAGE_SIZE = 20

function RelatedLink({ act }: { act: SalesActivity }) {
  if (act.clientId) {
    return (
      <Link to={`/app/clients/${act.clientId}`} className="text-primary-600 hover:underline">
        {act.clientName ?? '客户'}
      </Link>
    )
  }
  if (act.leadId) {
    return (
      <Link to={`/app/leads/${act.leadId}`} className="text-primary-600 hover:underline">
        {act.leadName ?? '线索'}
      </Link>
    )
  }
  return <span className="text-gray-400">—</span>
}

export default function ActivitiesPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const { data, isLoading } = useQuery({
    queryKey: ['activities', { search: debouncedSearch, page }],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) })
      if (debouncedSearch) params.set('search', debouncedSearch)
      return crmApi
        .get<{ data: SalesActivity[]; total: number; page: number; pageSize: number }>(
          `/activities?${params}`,
        )
        .then((r) => r.data)
    },
  })

  const activities = data?.data ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl font-semibold text-gray-900">销售活动</h1>
        <p className="mt-0.5 text-sm text-gray-500">所有跟进记录汇总</p>
      </div>

      {/* 搜索栏 */}
      <div className="mb-4">
        <Input
          placeholder="搜索内容、关联客户/线索名称、跟进人..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-gray-500">加载中...</div>
      ) : activities.length === 0 ? (
        <div className="py-12 text-center text-sm text-gray-500">
          {debouncedSearch ? '未找到匹配记录' : '暂无活动记录'}
        </div>
      ) : (
        <>
          {/* 移动端：卡片列表 */}
          <div className="space-y-3 sm:hidden">
            {activities.map((act) => {
              const cfg = typeConfig[act.activityType] ?? typeConfig['Note']!
              return (
                <div key={act.id} className="rounded-lg border bg-white p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant={cfg.variant}>{cfg.label}</Badge>
                    <span className="text-xs text-gray-400">{formatDate(act.activityDate)}</span>
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-3">
                    {act.description ?? '—'}
                  </p>
                  <AttachmentList attachments={act.attachments} />
                  <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                    <span>关联：<RelatedLink act={act} /></span>
                    {act.userName && <span>{act.userName}</span>}
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
                  <th className="px-4 py-3 text-left font-medium text-gray-700">跟进人</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {activities.map((act) => {
                  const cfg = typeConfig[act.activityType] ?? typeConfig['Note']!
                  return (
                    <tr key={act.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Badge variant={cfg.variant}>{cfg.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-700 max-w-xs">
                        <div className="truncate">{act.description ?? '—'}</div>
                        <AttachmentList attachments={act.attachments} />
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        <RelatedLink act={act} />
                      </td>
                      <td className="px-4 py-3 text-gray-500">{act.userName ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(act.activityDate)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <Pagination page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </>
      )}
    </div>
  )
}
