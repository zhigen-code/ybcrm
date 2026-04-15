import { useState } from 'react'
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
import { ActivityModal } from '@/shared/components/ActivityModal'
import type { ActivitySubmitData } from '@/shared/components/ActivityModal'
import { formatDate } from '@/shared/utils/format'
import { useOptionGroup, getOptionColor, getOptionLabel } from '@/shared/hooks/useOptions'
import { useCrmAuth } from '@/app/auth/CrmAuthContext'
import type { Lead, Service } from '@/shared/types'

const createSchema = z.object({
  source: z.string().min(1, '请填写来源'),
  name: z.string().min(1, '请填写姓名'),
  contactInfo: z.string().min(1, '请填写联系方式'),
  intendedServices: z.array(z.string()).min(1, '请至少选择一个意向服务'),
  notes: z.string().optional(),
})
type CreateForm = z.infer<typeof createSchema>

export default function LeadsPage() {
  const queryClient = useQueryClient()
  const { user } = useCrmAuth()
  const [showCreate, setShowCreate] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [mineOnly, setMineOnly] = useState(false)
  const [followUpTarget, setFollowUpTarget] = useState<Lead | null>(null)

  // sales 角色后端已自动过滤，不需要切换
  const canToggleMine = user?.role !== 'sales'

  const { options: leadStatusOpts } = useOptionGroup('lead_status')
  const { data: servicesData } = useQuery({
    queryKey: ['services'],
    queryFn: () => crmApi.get<{ data: Service[] }>('/services').then((r) => r.data),
  })
  const serviceOptions = servicesData?.data ?? []

  const { data, isLoading } = useQuery({
    queryKey: ['leads', statusFilter, mineOnly],
    queryFn: () =>
      crmApi.get<{ data: Lead[]; total: number }>('/leads', {
        params: { status: statusFilter || undefined, mine: mineOnly ? 'true' : undefined },
      }).then((r) => r.data),
  })

  // 新建线索表单
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
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

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-gray-900">线索管理</h1>
          <p className="mt-0.5 text-xs sm:text-sm text-gray-500">共 {data?.total ?? 0} 条线索</p>
        </div>
        <Button onClick={() => setShowCreate(true)} size="sm">新建线索</Button>
      </div>

      {/* 视图切换 + 状态筛选 */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        {/* 我的线索 / 全部 切换（仅 admin/operations） */}
        {canToggleMine && (
          <div className="flex rounded-lg border bg-white overflow-hidden flex-shrink-0">
            <button
              onClick={() => setMineOnly(false)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                !mineOnly ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              全部
            </button>
            <button
              onClick={() => setMineOnly(true)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                mineOnly ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              我的线索
            </button>
          </div>
        )}

        {/* 状态筛选 */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          {statusFilterOptions.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setStatusFilter(value)}
              className={`flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                statusFilter === value
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-600 border hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-gray-500">加载中...</div>
      ) : !(data?.data ?? []).length ? (
        <div className="py-12 text-center text-sm text-gray-500">暂无线索</div>
      ) : (
        <>
          {/* 桌面端表格 */}
          <div className="hidden sm:block rounded-lg border bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">姓名</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">意向服务</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">状态</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">来源</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">负责人</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">创建时间</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(data?.data ?? []).map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{lead.name}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(lead.intendedServices ?? []).map((svc) => (
                          <Badge key={svc} variant="blue">{svc}</Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={getOptionColor(leadStatusOpts, lead.status)}>
                        {getOptionLabel(leadStatusOpts, lead.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{lead.source}</td>
                    <td className="px-4 py-3 text-gray-600">{lead.assignedToName ?? <span className="text-gray-400">未分配</span>}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(lead.createdAt)}</td>
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
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 移动端卡片列表 */}
          <div className="sm:hidden space-y-3">
            {(data?.data ?? []).map((lead) => (
              <div key={lead.id} className="rounded-lg border bg-white overflow-hidden">
                <Link
                  to={`/app/leads/${lead.id}`}
                  className="block p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{lead.name}</p>
                      <p className="mt-0.5 text-xs text-gray-500 truncate">{lead.contactInfo}</p>
                    </div>
                    <Badge variant={getOptionColor(leadStatusOpts, lead.status)} className="flex-shrink-0">
                      {getOptionLabel(leadStatusOpts, lead.status)}
                    </Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(lead.intendedServices ?? []).map((svc) => (
                      <Badge key={svc} variant="blue">{svc}</Badge>
                    ))}
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                    <span>{lead.source}</span>
                    {lead.assignedToName
                      ? <span>· 负责人：{lead.assignedToName}</span>
                      : <span className="text-gray-400">· 未分配</span>
                    }
                    <span className="ml-auto">{formatDate(lead.createdAt)}</span>
                  </div>
                </Link>
                <div className="border-t px-4 py-2 flex justify-end">
                  <button
                    onClick={(e) => openFollowUp(lead, e)}
                    className="text-sm text-primary-600 font-medium"
                  >
                    + 添加跟进记录
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* 新建线索弹窗 */}
      {showCreate && (
        <Modal title="新建线索" onClose={() => { setShowCreate(false); reset() }}>
          <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-3">
            <Input label="来源" error={errors.source?.message} {...register('source')} />
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
              <Button variant="secondary" type="button" onClick={() => { setShowCreate(false); reset() }}>
                取消
              </Button>
              <Button type="submit" loading={isSubmitting || createMutation.isPending}>
                创建
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* 快速跟进弹窗 */}
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
