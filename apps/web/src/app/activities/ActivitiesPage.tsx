import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { crmApi } from '@/shared/utils/request'
import { Badge } from '@/shared/components/Badge'
import { AttachmentList } from '@/shared/components/AttachmentList'
import { Pagination } from '@/shared/components/Pagination'
import { formatDate } from '@/shared/utils/format'
import { useOptionGroup, getOptionColor } from '@/shared/hooks/useOptions'
import { useCrmAuth } from '@/app/auth/CrmAuthContext'
import type { SalesActivity, User } from '@/shared/types'

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
  const { user } = useCrmAuth()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [activityTypeFilter, setActivityTypeFilter] = useState('')
  const [entityTypeFilter, setEntityTypeFilter] = useState('')
  const [assignedUserFilter, setAssignedUserFilter] = useState('')
  const [activityDateFilter, setActivityDateFilter] = useState('')
  const [nextContactFilter, setNextContactFilter] = useState('')
  const filterPanelRef = useRef<HTMLDivElement>(null)

  const canFilterUser = user?.role === 'admin' || user?.role === 'operations'

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(search); setPage(1) }, 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterPanelRef.current && !filterPanelRef.current.contains(e.target as Node)) {
        setShowFilterPanel(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const { options: activityTypeOpts } = useOptionGroup('activity_type')

  const { data: usersData } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => crmApi.get<{ data: User[] }>('/users').then((r) => r.data),
    enabled: canFilterUser,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['activities', { search: debouncedSearch, activityTypeFilter, entityTypeFilter, assignedUserFilter, activityDateFilter, nextContactFilter, page }],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) })
      if (debouncedSearch) params.set('search', debouncedSearch)
      if (activityTypeFilter) params.set('activityType', activityTypeFilter)
      if (entityTypeFilter) params.set('entityType', entityTypeFilter)
      if (assignedUserFilter) params.set('assignedUserId', assignedUserFilter)
      if (activityDateFilter) params.set('activityDate', activityDateFilter)
      if (nextContactFilter) params.set('nextContact', nextContactFilter)
      return crmApi
        .get<{ data: SalesActivity[]; total: number; page: number; pageSize: number }>(`/activities?${params}`)
        .then((r) => r.data)
    },
  })

  const activities = data?.data ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const hasFilter = !!(activityTypeFilter || entityTypeFilter || assignedUserFilter || activityDateFilter || nextContactFilter)
  const resetFilters = () => {
    setActivityTypeFilter(''); setEntityTypeFilter(''); setAssignedUserFilter('')
    setActivityDateFilter(''); setNextContactFilter(''); setPage(1)
  }

  const selectClass = 'rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary-500'

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl font-semibold text-gray-900">销售活动</h1>
        <p className="mt-0.5 text-sm text-gray-500">共 {total} 条记录</p>
      </div>

      {/* 搜索框 + 筛选 */}
      <div className="mb-4 relative" ref={filterPanelRef}>
        <div className="flex items-center rounded-md border border-gray-300 bg-white shadow-sm transition-colors focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500">
          <input
            className="flex-1 px-3 py-2 text-sm bg-transparent outline-none placeholder:text-gray-400"
            placeholder="搜索内容、关联客户/线索、跟进人..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            onClick={() => setShowFilterPanel((v) => !v)}
            className="relative flex items-center gap-1 px-3 py-2 border-l border-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
          >
            {hasFilter && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary-500" />
            )}
            <span className="text-xs">筛选</span>
            <svg
              className={`w-3.5 h-3.5 transition-transform ${showFilterPanel ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {showFilterPanel && (
          <div className="absolute z-20 top-full left-0 right-0 mt-1 rounded-md border border-gray-200 bg-white shadow-lg p-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">跟进类型</label>
                <select value={activityTypeFilter} onChange={(e) => { setActivityTypeFilter(e.target.value); setPage(1) }} className={selectClass}>
                  <option value="">全部类型</option>
                  {activityTypeOpts.filter((o) => o.value !== 'System' && o.isActive).map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">关联对象</label>
                <select value={entityTypeFilter} onChange={(e) => { setEntityTypeFilter(e.target.value); setPage(1) }} className={selectClass}>
                  <option value="">全部</option>
                  <option value="lead">线索</option>
                  <option value="client">客户</option>
                </select>
              </div>
              {canFilterUser && usersData?.data && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-500">跟进人</label>
                  <select value={assignedUserFilter} onChange={(e) => { setAssignedUserFilter(e.target.value); setPage(1) }} className={selectClass}>
                    <option value="">全部跟进人</option>
                    {usersData.data.filter((u) => u.isActive).map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">跟进时间</label>
                <select value={activityDateFilter} onChange={(e) => { setActivityDateFilter(e.target.value); setPage(1) }} className={selectClass}>
                  <option value="">全部时间</option>
                  <option value="today">今天</option>
                  <option value="week">最近 7 天</option>
                  <option value="month">最近 30 天</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">下次联系</label>
                <select value={nextContactFilter} onChange={(e) => { setNextContactFilter(e.target.value); setPage(1) }} className={selectClass}>
                  <option value="">全部</option>
                  <option value="overdue">已逾期</option>
                  <option value="today">今天到期</option>
                  <option value="week">未来 7 天</option>
                </select>
              </div>
            </div>
            {hasFilter && (
              <div className="mt-2 pt-2 border-t border-gray-100 flex justify-end">
                <button onClick={resetFilters} className="text-xs text-gray-400 hover:text-gray-600">重置筛选</button>
              </div>
            )}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-gray-500">加载中...</div>
      ) : activities.length === 0 ? (
        <div className="py-12 text-center text-sm text-gray-500">
          {debouncedSearch || hasFilter ? '未找到匹配记录' : '暂无活动记录'}
        </div>
      ) : (
        <>
          {/* 移动端：卡片 */}
          <div className="space-y-3 sm:hidden">
            {activities.map((act) => {
              const typeOpt = activityTypeOpts.find((o) => o.value === act.activityType)
              return (
                <div key={act.id} className="rounded-lg border bg-white p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant={getOptionColor(activityTypeOpts, act.activityType)}>
                      {typeOpt?.label ?? act.activityType}
                    </Badge>
                    <span className="text-xs text-gray-400">{formatDate(act.activityDate)}</span>
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-3">{act.description ?? '—'}</p>
                  <AttachmentList attachments={act.attachments} />
                  <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                    <span>关联：<RelatedLink act={act} /></span>
                    {act.userName && <span>{act.userName}</span>}
                  </div>
                  {act.nextContactDate && (
                    <div className="mt-1 text-xs text-gray-400">
                      下次联系：<span className={new Date(act.nextContactDate) < new Date() ? 'text-red-500 font-medium' : 'text-gray-500'}>{formatDate(act.nextContactDate)}</span>
                    </div>
                  )}
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
                  <th className="px-4 py-3 text-left font-medium text-gray-700">跟进时间</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">下次联系</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {activities.map((act) => {
                  const typeOpt = activityTypeOpts.find((o) => o.value === act.activityType)
                  return (
                    <tr key={act.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Badge variant={getOptionColor(activityTypeOpts, act.activityType)}>
                          {typeOpt?.label ?? act.activityType}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-700 max-w-xs">
                        <div className="truncate">{act.description ?? '—'}</div>
                        <AttachmentList attachments={act.attachments} />
                      </td>
                      <td className="px-4 py-3 text-gray-500"><RelatedLink act={act} /></td>
                      <td className="px-4 py-3 text-gray-500">{act.userName ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(act.activityDate)}</td>
                      <td className="px-4 py-3 text-xs">
                        {act.nextContactDate
                          ? <span className={new Date(act.nextContactDate) < new Date() ? 'text-red-500 font-medium' : 'text-gray-500'}>{formatDate(act.nextContactDate)}</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
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
