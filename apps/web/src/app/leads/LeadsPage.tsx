import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { crmApi } from '@/shared/utils/request'
import { Button } from '@/shared/components/Button'
import { Input } from '@/shared/components/Input'
import { Badge } from '@/shared/components/Badge'
import { Modal } from '@/shared/components/Modal'
import { Select } from '@/shared/components/Select'
import { Textarea } from '@/shared/components/Textarea'
import { Combobox } from '@/shared/components/Combobox'
import { Pagination } from '@/shared/components/Pagination'
import { ActivityModal } from '@/shared/components/ActivityModal'
import type { ActivitySubmitData } from '@/shared/components/ActivityModal'
import { formatDate } from '@/shared/utils/format'
import { useOptionGroup, getOptionColor, getOptionLabel } from '@/shared/hooks/useOptions'
import { useCrmAuth } from '@/app/auth/CrmAuthContext'
import type { Lead, Service, User } from '@/shared/types'

// ─── 列配置 ───────────────────────────────────────────────────────────────────

const LEAD_COLUMNS = [
  { key: 'leadNo',           label: '编号',     required: false },
  { key: 'name',             label: '姓名',     required: true  },
  { key: 'contactInfo',      label: '联系方式',  required: false },
  { key: 'intendedServices', label: '意向服务',  required: false },
  { key: 'status',           label: '状态',     required: false },
  { key: 'source',           label: '来源',     required: false },
  { key: 'assignedToName',   label: '负责人',   required: false },
  { key: 'nextContactDate',  label: '下次联系',  required: false },
  { key: 'activityCount',    label: '跟进次数',  required: false },
  { key: 'createdAt',        label: '创建时间',  required: false },
] as const

type ColKey = typeof LEAD_COLUMNS[number]['key']
type ColConfig = { key: ColKey; visible: boolean }

const DEFAULT_COLS: ColConfig[] = LEAD_COLUMNS.map((c) => ({ key: c.key, visible: true }))
const STORAGE_PREFIX = 'crm_leads_cols_'

function loadColConfig(userId: string): ColConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + userId)
    if (!raw) return DEFAULT_COLS
    const saved = JSON.parse(raw) as ColConfig[]
    // 保留已有列，追加新列到末尾
    const savedKeys = new Set(saved.map((c) => c.key))
    return [
      ...saved.filter((c) => LEAD_COLUMNS.some((lc) => lc.key === c.key)),
      ...LEAD_COLUMNS.filter((c) => !savedKeys.has(c.key)).map((c) => ({ key: c.key, visible: true })),
    ]
  } catch {
    return DEFAULT_COLS
  }
}

function saveColConfig(userId: string, config: ColConfig[]) {
  localStorage.setItem(STORAGE_PREFIX + userId, JSON.stringify(config))
}

// ─── 表单 schema ──────────────────────────────────────────────────────────────

const createSchema = z.object({
  source: z.string().min(1, '请填写来源'),
  name: z.string().min(1, '请填写姓名'),
  contactInfo: z.string().min(1, '请填写联系方式'),
  intendedServices: z.array(z.string()).min(1, '请至少选择一个意向服务'),
  notes: z.string().optional(),
})
type CreateForm = z.infer<typeof createSchema>

// ─── 列设置面板 ───────────────────────────────────────────────────────────────

function ColSettingsPanel({
  config,
  onChange,
  onClose,
}: {
  config: ColConfig[]
  onChange: (c: ColConfig[]) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const toggle = (key: ColKey) => {
    const col = LEAD_COLUMNS.find((c) => c.key === key)
    if (col?.required) return
    onChange(config.map((c) => (c.key === key ? { ...c, visible: !c.visible } : c)))
  }

  const move = (key: ColKey, dir: -1 | 1) => {
    const idx = config.findIndex((c) => c.key === key)
    const next = idx + dir
    if (next < 0 || next >= config.length) return
    const arr = [...config]
    ;[arr[idx], arr[next]] = [arr[next]!, arr[idx]!]
    onChange(arr)
  }

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-1 z-50 w-48 rounded-lg border bg-white shadow-lg py-1"
      onClick={(e) => e.stopPropagation()}
    >
      <p className="px-3 py-1.5 text-xs font-semibold text-gray-400 border-b">列显示与排序</p>
      <ul className="py-1">
        {config.map((c, idx) => {
          const def = LEAD_COLUMNS.find((lc) => lc.key === c.key)!
          return (
            <li key={c.key} className="flex items-center gap-1 px-2 py-0.5">
              <input
                type="checkbox"
                checked={c.visible}
                disabled={def.required}
                onChange={() => toggle(c.key)}
                className="accent-primary-600 cursor-pointer disabled:opacity-40"
              />
              <span className={`flex-1 text-xs px-1 ${def.required ? 'text-gray-400' : 'text-gray-700'}`}>
                {def.label}
              </span>
              <button
                onClick={() => move(c.key, -1)}
                disabled={idx === 0}
                className="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-20"
              >
                ▲
              </button>
              <button
                onClick={() => move(c.key, 1)}
                disabled={idx === config.length - 1}
                className="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-20"
              >
                ▼
              </button>
            </li>
          )
        })}
      </ul>
      <div className="border-t px-3 py-1.5">
        <button
          onClick={() => onChange(DEFAULT_COLS)}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          恢复默认
        </button>
      </div>
    </div>
  )
}

// ─── 主页面 ───────────────────────────────────────────────────────────────────

export default function LeadsPage() {
  const queryClient = useQueryClient()
  const { user } = useCrmAuth()
  const [showCreate, setShowCreate] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [assignedToFilter, setAssignedToFilter] = useState('')
  const [nextContactFilter, setNextContactFilter] = useState('')
  const [createdAtFilter, setCreatedAtFilter] = useState('')
  const [activityCountFilter, setActivityCountFilter] = useState('')
  const [serviceFilter, setServiceFilter] = useState('')
  const [mineOnly, setMineOnly] = useState(false)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [followUpTarget, setFollowUpTarget] = useState<Lead | null>(null)
  const [colConfig, setColConfig] = useState<ColConfig[]>(DEFAULT_COLS)
  const [showColSettings, setShowColSettings] = useState(false)
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const filterPanelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterPanelRef.current && !filterPanelRef.current.contains(e.target as Node)) {
        setShowFilterPanel(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const PAGE_SIZE = 20
  const canToggleMine = user?.role !== 'sales'
  const isAdmin = user?.role === 'admin'

  // 用户加载后读取列设置
  useEffect(() => {
    if (user?.id) setColConfig(loadColConfig(user.id))
  }, [user?.id])

  const updateColConfig = (next: ColConfig[]) => {
    setColConfig(next)
    if (user?.id) saveColConfig(user.id, next)
  }

  const { options: leadStatusOpts } = useOptionGroup('lead_status')
  const { data: sourcesData } = useQuery({
    queryKey: ['lead-sources'],
    queryFn: () => crmApi.get<{ data: string[] }>('/leads/sources').then((r) => r.data),
  })
  const sourceOptions = sourcesData?.data ?? []

  const { data: servicesData } = useQuery({
    queryKey: ['services'],
    queryFn: () => crmApi.get<{ data: Service[] }>('/services').then((r) => r.data),
  })
  const serviceOptions = servicesData?.data ?? []

  const canFilterAssignee = user?.role === 'admin' || user?.role === 'operations'
  const { data: usersData } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => crmApi.get<{ data: User[] }>('/users').then((r) => r.data),
    enabled: canFilterAssignee,
  })

  const searchTimeout = useState<ReturnType<typeof setTimeout> | null>(null)
  const handleSearch = (val: string) => {
    setSearch(val)
    if (searchTimeout[0]) clearTimeout(searchTimeout[0])
    searchTimeout[1](setTimeout(() => { setDebouncedSearch(val); setPage(1) }, 300))
  }

  const { data, isLoading } = useQuery({
    queryKey: ['leads', statusFilter, sourceFilter, assignedToFilter, nextContactFilter, createdAtFilter, activityCountFilter, serviceFilter, mineOnly, debouncedSearch, page],
    queryFn: () =>
      crmApi.get<{ data: Lead[]; total: number; page: number; pageSize: number }>('/leads', {
        params: {
          status: statusFilter || undefined,
          source: sourceFilter || undefined,
          assignedTo: assignedToFilter || undefined,
          nextContact: nextContactFilter || undefined,
          createdAt: createdAtFilter || undefined,
          activityCount: activityCountFilter || undefined,
          service: serviceFilter || undefined,
          mine: mineOnly ? 'true' : undefined,
          search: debouncedSearch || undefined,
          page,
          pageSize: PAGE_SIZE,
        },
      }).then((r) => r.data),
  })

  const filtered = data?.data ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const {
    register, handleSubmit, reset, watch, setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { intendedServices: [] },
  })
  const selectedServices = watch('intendedServices') ?? []
  const toggleService = (svc: string) => {
    const next = selectedServices.includes(svc)
      ? selectedServices.filter((s) => s !== svc)
      : [...selectedServices, svc]
    setValue('intendedServices', next, { shouldValidate: true })
  }

  const deleteLead = useMutation({
    mutationFn: (id: string) => crmApi.delete(`/leads/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leads'] }),
  })

  const createMutation = useMutation({
    mutationFn: (body: CreateForm) => crmApi.post('/leads', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      setShowCreate(false)
      reset()
    },
  })

  const addActivity = useMutation({
    mutationFn: (body: ActivitySubmitData) =>
      crmApi.post('/activities', { ...body, leadId: followUpTarget!.id }),
    onSuccess: () => setFollowUpTarget(null),
  })

  const openFollowUp = (lead: Lead, e: React.MouseEvent) => {
    e.preventDefault()
    setFollowUpTarget(lead)
  }

  const statusFilterOptions = [
    { value: '', label: '全部' },
    ...leadStatusOpts.map((o) => ({ value: o.value, label: o.label })),
  ]

  const visibleCols = colConfig.filter((c) => c.visible)

  const renderTd = (lead: Lead, key: ColKey) => {
    switch (key) {
      case 'leadNo':
        return <td key={key} className="px-4 py-3 text-gray-400 text-xs font-mono">L-{String(lead.leadNo ?? '').padStart(4, '0')}</td>
      case 'name':
        return <td key={key} className="px-4 py-3 font-medium text-gray-900">{lead.name}</td>
      case 'contactInfo':
        return <td key={key} className="px-4 py-3 text-gray-600">{lead.contactInfo}</td>
      case 'intendedServices':
        return (
          <td key={key} className="px-4 py-3">
            <div className="flex flex-wrap gap-1">
              {(lead.intendedServices ?? []).map((svc) => <Badge key={svc} variant="blue">{svc}</Badge>)}
            </div>
          </td>
        )
      case 'status':
        return (
          <td key={key} className="px-4 py-3">
            <Badge variant={getOptionColor(leadStatusOpts, lead.status)}>
              {getOptionLabel(leadStatusOpts, lead.status)}
            </Badge>
          </td>
        )
      case 'source':
        return <td key={key} className="px-4 py-3 text-gray-600">{lead.source}</td>
      case 'assignedToName':
        return <td key={key} className="px-4 py-3 text-gray-600">{lead.assignedToName ?? <span className="text-gray-400">未分配</span>}</td>
      case 'nextContactDate':
        return (
          <td key={key} className="px-4 py-3 text-xs">
            {lead.nextContactDate
              ? <span className={new Date(lead.nextContactDate) < new Date() ? 'text-red-500 font-medium' : 'text-gray-500'}>{formatDate(lead.nextContactDate)}</span>
              : <span className="text-gray-300">—</span>}
          </td>
        )
      case 'activityCount':
        return <td key={key} className="px-4 py-3 text-gray-500 text-xs">{lead.activityCount ?? 0}</td>
      case 'createdAt':
        return <td key={key} className="px-4 py-3 text-gray-500">{formatDate(lead.createdAt)}</td>
    }
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-gray-900">线索管理</h1>
          <p className="mt-0.5 text-xs sm:text-sm text-gray-500">共 {total} 条线索</p>
        </div>
        <Button onClick={() => setShowCreate(true)} size="sm">新建线索</Button>
      </div>

      {/* 搜索框 + 筛选下拉 */}
      <div className="mb-3 relative" ref={filterPanelRef}>
        <div className="flex items-center rounded-md border border-gray-300 bg-white shadow-sm transition-colors focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500">
          <input
            className="flex-1 px-3 py-2 text-sm bg-transparent outline-none placeholder:text-gray-400"
            placeholder="搜索姓名、联系方式、来源、编号..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
          <button
            onClick={() => setShowFilterPanel((v) => !v)}
            className="relative flex items-center gap-1 px-3 py-2 border-l border-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
          >
            {(sourceFilter || assignedToFilter || nextContactFilter || createdAtFilter || activityCountFilter || serviceFilter) && (
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
              {sourceOptions.length > 0 && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-500">来源</label>
                  <select
                    value={sourceFilter}
                    onChange={(e) => { setSourceFilter(e.target.value); setPage(1) }}
                    className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  >
                    <option value="">全部来源</option>
                    {sourceOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}
              {canFilterAssignee && usersData?.data && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-500">负责人</label>
                  <select
                    value={assignedToFilter}
                    onChange={(e) => { setAssignedToFilter(e.target.value); setPage(1) }}
                    className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  >
                    <option value="">全部负责人</option>
                    {usersData.data.filter((u) => u.isActive).map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">下次联系</label>
                <select
                  value={nextContactFilter}
                  onChange={(e) => { setNextContactFilter(e.target.value); setPage(1) }}
                  className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="">全部</option>
                  <option value="overdue">已逾期</option>
                  <option value="today">今天到期</option>
                  <option value="week">未来 7 天</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">添加时间</label>
                <select
                  value={createdAtFilter}
                  onChange={(e) => { setCreatedAtFilter(e.target.value); setPage(1) }}
                  className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="">全部时间</option>
                  <option value="today">今天</option>
                  <option value="week">最近 7 天</option>
                  <option value="month">最近 30 天</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">跟进次数</label>
                <select
                  value={activityCountFilter}
                  onChange={(e) => { setActivityCountFilter(e.target.value); setPage(1) }}
                  className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="">全部</option>
                  <option value="0">未跟进</option>
                  <option value="1-3">1—3 次</option>
                  <option value="3+">3 次以上</option>
                </select>
              </div>
              {serviceOptions.length > 0 && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-500">意向服务</label>
                  <select
                    value={serviceFilter}
                    onChange={(e) => { setServiceFilter(e.target.value); setPage(1) }}
                    className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  >
                    <option value="">全部服务</option>
                    {serviceOptions.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
              )}
            </div>
            {(sourceFilter || assignedToFilter || nextContactFilter || createdAtFilter || activityCountFilter || serviceFilter) && (
              <div className="mt-2 pt-2 border-t border-gray-100 flex justify-end">
                <button
                  onClick={() => { setSourceFilter(''); setAssignedToFilter(''); setNextContactFilter(''); setCreatedAtFilter(''); setActivityCountFilter(''); setServiceFilter(''); setPage(1) }}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  重置筛选
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        {canToggleMine && (
          <div className="flex rounded-lg border bg-white overflow-hidden flex-shrink-0">
            <button
              onClick={() => { setMineOnly(false); setPage(1) }}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${!mineOnly ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              全部
            </button>
            <button
              onClick={() => { setMineOnly(true); setPage(1) }}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${mineOnly ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              我的线索
            </button>
          </div>
        )}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          {statusFilterOptions.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => { setStatusFilter(value); setPage(1) }}
              className={`flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                statusFilter === value ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-gray-500">加载中...</div>
      ) : !filtered.length ? (
        <div className="py-12 text-center text-sm text-gray-500">{search ? '无匹配线索' : '暂无线索'}</div>
      ) : (
        <>
          {/* 桌面端表格 */}
          <div className="hidden sm:block rounded-lg border bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {visibleCols.map((c) => {
                    const def = LEAD_COLUMNS.find((lc) => lc.key === c.key)!
                    return (
                      <th key={c.key} className="px-4 py-3 text-left font-medium text-gray-700 whitespace-nowrap">
                        {def.label}
                      </th>
                    )
                  })}
                  {/* 操作列 + 齿轮 */}
                  <th className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1 relative">
                      <button
                        onClick={() => setShowColSettings((v) => !v)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        title="列设置"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                      </button>
                      {showColSettings && (
                        <ColSettingsPanel
                          config={colConfig}
                          onChange={(next) => { updateColConfig(next) }}
                          onClose={() => setShowColSettings(false)}
                        />
                      )}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    {visibleCols.map((c) => renderTd(lead, c.key))}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => openFollowUp(lead, e)}
                          className="text-xs text-primary-600 hover:text-primary-800 font-medium"
                        >
                          + 跟进
                        </button>
                        <span className="text-gray-300">|</span>
                        <Link to={`/app/leads/${lead.id}`} className="text-xs text-gray-500 hover:text-gray-700">
                          详情
                        </Link>
                        {isAdmin && (
                          <>
                            <span className="text-gray-300">|</span>
                            <button
                              onClick={() => { if (confirm(`确认删除线索「${lead.name}」？此操作不可恢复。`)) deleteLead.mutate(lead.id) }}
                              className="text-xs text-red-500 hover:text-red-700"
                            >
                              删除
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 移动端卡片列表 */}
          <div className="sm:hidden space-y-2">
            {filtered.map((lead) => (
              <div key={lead.id} className="rounded-lg border bg-white overflow-hidden">
                <Link to={`/app/leads/${lead.id}`} className="block p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{lead.name}</p>
                      <p className="mt-0.5 text-xs text-gray-500 truncate">
                        <span className="font-mono text-gray-400">L-{String(lead.leadNo ?? '').padStart(4, '0')}</span>
                        {lead.contactInfo && <span className="ml-1">{lead.contactInfo}</span>}
                      </p>
                    </div>
                    <Badge variant={getOptionColor(leadStatusOpts, lead.status)} className="flex-shrink-0">
                      {getOptionLabel(leadStatusOpts, lead.status)}
                    </Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(lead.intendedServices ?? []).map((svc) => <Badge key={svc} variant="blue">{svc}</Badge>)}
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                    <span>{lead.source}</span>
                    {lead.assignedToName
                      ? <span>· 负责人：{lead.assignedToName}</span>
                      : <span className="text-gray-400">· 未分配</span>}
                    <span className="ml-auto">{formatDate(lead.createdAt)}</span>
                  </div>
                </Link>
                <div className="border-t px-4 py-2 flex justify-end">
                  <button onClick={(e) => openFollowUp(lead, e)} className="text-sm text-primary-600 font-medium">
                    + 添加跟进记录
                  </button>
                </div>
              </div>
            ))}
          </div>

          <Pagination page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </>
      )}

      {showCreate && (
        <Modal title="新建线索" onClose={() => { setShowCreate(false); reset() }}>
          <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-3">
            <Combobox
              label="来源"
              error={errors.source?.message}
              value={watch('source') ?? ''}
              onChange={(v) => setValue('source', v, { shouldValidate: true })}
              options={sourceOptions}
              placeholder="输入或选择已有来源..."
            />
            <Input label="姓名" error={errors.name?.message} {...register('name')} />
            <Input label="联系方式" error={errors.contactInfo?.message} {...register('contactInfo')} />
            <div>
              <p className="mb-1.5 text-sm font-medium text-gray-700">意向服务</p>
              <div className="flex flex-wrap gap-2">
                {serviceOptions.map((svc) => (
                  <button
                    key={svc.id}
                    type="button"
                    onClick={() => toggleService(svc.name)}
                    className={`rounded-full px-3 py-1 text-sm font-medium border transition-colors ${
                      selectedServices.includes(svc.name)
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-primary-400'
                    }`}
                  >
                    {svc.name}
                  </button>
                ))}
              </div>
              {errors.intendedServices && (
                <p className="mt-1 text-xs text-red-500">{errors.intendedServices.message}</p>
              )}
            </div>
            <Textarea label="备注" {...register('notes')} />
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="secondary" type="button" onClick={() => { setShowCreate(false); reset() }}>取消</Button>
              <Button type="submit" loading={isSubmitting || createMutation.isPending}>创建</Button>
            </div>
          </form>
        </Modal>
      )}

      {followUpTarget && (
        <ActivityModal
          title={`跟进：${followUpTarget.name}`}
          onClose={() => setFollowUpTarget(null)}
          loading={addActivity.isPending}
          onSubmit={(d) => addActivity.mutate(d)}
        />
      )}
    </div>
  )
}
