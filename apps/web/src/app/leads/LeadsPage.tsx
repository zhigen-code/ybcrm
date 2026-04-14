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
import { Textarea } from '@/shared/components/Textarea'
import { formatDate } from '@/shared/utils/format'
import type { Lead, LeadStatus, IntendedService } from '@/shared/types'
import { SERVICE_OPTIONS } from '@/shared/types'

const statusVariant: Record<LeadStatus, 'gray' | 'blue' | 'green' | 'yellow' | 'red'> = {
  New: 'blue',
  Contacted: 'yellow',
  Qualified: 'gray',
  Converted: 'green',
  Lost: 'red',
}

const statusLabel: Record<LeadStatus, string> = {
  New: '新线索',
  Contacted: '已联系',
  Qualified: '已确认',
  Converted: '已转化',
  Lost: '已丢失',
}

const createSchema = z.object({
  source: z.string().min(1, '请填写来源'),
  name: z.string().min(1, '请填写姓名'),
  contactInfo: z.string().min(1, '请填写联系方式'),
  intendedServices: z.array(z.enum(['赴美试管', '代孕', '供精', '供卵'] as [IntendedService, ...IntendedService[]])).min(1, '请至少选择一个意向服务'),
  notes: z.string().optional(),
})
type CreateForm = z.infer<typeof createSchema>

const statusFilterOptions = [
  { value: '', label: '全部' },
  { value: 'New', label: '新线索' },
  { value: 'Contacted', label: '已联系' },
  { value: 'Qualified', label: '已确认' },
  { value: 'Converted', label: '已转化' },
  { value: 'Lost', label: '已丢失' },
]

export default function LeadsPage() {
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['leads', statusFilter],
    queryFn: () =>
      crmApi
        .get<{ data: Lead[]; total: number }>('/leads', { params: { status: statusFilter || undefined } })
        .then((r) => r.data),
  })

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

  const toggleService = (svc: IntendedService) => {
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

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-gray-900">线索管理</h1>
          <p className="mt-0.5 text-xs sm:text-sm text-gray-500">共 {data?.total ?? 0} 条线索</p>
        </div>
        <Button onClick={() => setShowCreate(true)} size="sm">新建线索</Button>
      </div>

      {/* 状态筛选 */}
      <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
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

      {isLoading ? (
        <div className="py-12 text-center text-sm text-gray-500">加载中...</div>
      ) : !data?.data.length ? (
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
                  <th className="px-4 py-3 text-left font-medium text-gray-700">创建人</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">创建时间</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.data.map((lead) => (
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
                      <Badge variant={statusVariant[lead.status]}>{statusLabel[lead.status]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{lead.source}</td>
                    <td className="px-4 py-3 text-gray-600">{lead.createdByName ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(lead.createdAt)}</td>
                    <td className="px-4 py-3">
                      <Link to={`/app/leads/${lead.id}`} className="text-primary-600 hover:underline">
                        查看
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 移动端卡片列表 */}
          <div className="sm:hidden space-y-3">
            {data.data.map((lead) => (
              <Link
                key={lead.id}
                to={`/app/leads/${lead.id}`}
                className="block rounded-lg border bg-white p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{lead.name}</p>
                    <p className="mt-0.5 text-xs text-gray-500 truncate">{lead.contactInfo}</p>
                  </div>
                  <Badge variant={statusVariant[lead.status]} className="flex-shrink-0">
                    {statusLabel[lead.status]}
                  </Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {(lead.intendedServices ?? []).map((svc) => (
                    <Badge key={svc} variant="blue">{svc}</Badge>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                  <span>{lead.source}</span>
                  {lead.createdByName && <span>· {lead.createdByName}</span>}
                  <span className="ml-auto">{formatDate(lead.createdAt)}</span>
                </div>
              </Link>
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
                {SERVICE_OPTIONS.map((svc) => (
                  <button
                    key={svc}
                    type="button"
                    onClick={() => toggleService(svc)}
                    className={`rounded-full px-3 py-1 text-sm font-medium border transition-colors ${
                      selectedServices.includes(svc)
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-primary-400'
                    }`}
                  >
                    {svc}
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
    </div>
  )
}
