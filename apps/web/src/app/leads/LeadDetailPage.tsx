import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { crmApi } from '@/shared/utils/request'
import { Button } from '@/shared/components/Button'
import { Badge } from '@/shared/components/Badge'
import { Modal } from '@/shared/components/Modal'
import { Select } from '@/shared/components/Select'
import { Textarea } from '@/shared/components/Textarea'
import { Input } from '@/shared/components/Input'
import { formatDate } from '@/shared/utils/format'
import { useOptionGroup, toSelectOptions, getOptionLabel } from '@/shared/hooks/useOptions'
import type { Lead, LeadStatus, SalesActivity } from '@/shared/types'
import { useState } from 'react'

const activitySchema = z.object({
  activityType: z.string().min(1),
  description: z.string().optional(),
  activityDate: z.string().min(1),
})
type ActivityForm = z.infer<typeof activitySchema>

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showActivity, setShowActivity] = useState(false)

  const { options: leadStatusOpts } = useOptionGroup('lead_status')
  const { options: activityTypeOpts } = useOptionGroup('activity_type')

  const { data: lead } = useQuery({
    queryKey: ['lead', id],
    queryFn: () => crmApi.get<{ data: Lead }>(`/leads/${id}`).then((r) => r.data.data),
  })

  const { data: activities } = useQuery({
    queryKey: ['activities', 'lead', id],
    queryFn: () =>
      crmApi.get<{ data: SalesActivity[] }>('/activities', { params: { leadId: id } }).then((r) => r.data.data),
  })

  const updateStatus = useMutation({
    mutationFn: (status: LeadStatus) => crmApi.put(`/leads/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lead', id] }),
  })

  const convertToClient = useMutation({
    mutationFn: () =>
      crmApi.post('/clients', {
        leadId: id,
        name: lead?.name,
        phone: lead?.contactInfo,
        servicePlans: lead?.intendedServices ?? [],
        assignedSalesUserId: lead?.assignedToUserId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      navigate('/app/clients')
    },
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<ActivityForm>({
    resolver: zodResolver(activitySchema),
    defaultValues: { activityDate: new Date().toISOString().slice(0, 16) },
  })

  const addActivity = useMutation({
    mutationFn: (body: ActivityForm) => crmApi.post('/activities', { ...body, leadId: id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities', 'lead', id] })
      setShowActivity(false)
      reset()
    },
  })

  if (!lead) return <div className="p-6 text-sm text-gray-500">加载中...</div>

  return (
    <div className="p-4 sm:p-6 max-w-3xl">
      <button onClick={() => navigate(-1)} className="mb-4 text-sm text-gray-500 hover:text-gray-700">
        ← 返回
      </button>

      {/* 基本信息 */}
      <div className="rounded-lg border bg-white p-4 sm:p-6 mb-4 sm:mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{lead.name}</h1>
            <p className="mt-1 text-sm text-gray-500">{lead.contactInfo} · {lead.source}</p>
          </div>
          <div className="flex flex-wrap gap-1">
            {(lead.intendedServices ?? []).map((svc) => (
              <Badge key={svc}>{svc}</Badge>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-600">状态：</span>
          <div className="flex flex-wrap gap-1.5">
            {leadStatusOpts.filter((o) => o.value !== 'Converted').map((o) => (
              <button
                key={o.value}
                onClick={() => updateStatus.mutate(o.value as LeadStatus)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  lead.status === o.value
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {lead.notes && (
          <p className="mt-3 text-sm text-gray-600 bg-gray-50 rounded p-3">{lead.notes}</p>
        )}

        <div className="mt-4 text-xs text-gray-400">
          创建人：{lead.createdByName ?? '—'} · 创建于 {formatDate(lead.createdAt)}
        </div>

        {lead.status !== 'Converted' && lead.status !== 'Lost' && (
          <div className="mt-4 pt-4 border-t">
            <Button
              variant="primary"
              size="sm"
              onClick={() => convertToClient.mutate()}
              loading={convertToClient.isPending}
            >
              转化为客户
            </Button>
          </div>
        )}
      </div>

      {/* 跟进记录 */}
      <div className="rounded-lg border bg-white p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">跟进记录</h2>
          <Button size="sm" variant="secondary" onClick={() => setShowActivity(true)}>
            添加记录
          </Button>
        </div>

        {!activities?.length ? (
          <p className="text-sm text-gray-500">暂无跟进记录</p>
        ) : (
          <div className="space-y-3">
            {activities.map((act) => (
              <div key={act.id} className="flex gap-3 text-sm">
                <span className="mt-0.5 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 h-fit">
                  {getOptionLabel(activityTypeOpts, act.activityType)}
                </span>
                <div className="flex-1">
                  <p className="text-gray-700">{act.description ?? '（无描述）'}</p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {act.userName ?? '—'} · {formatDate(act.activityDate)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 添加活动弹窗 */}
      {showActivity && (
        <Modal
          title="添加跟进记录"
          onClose={() => { setShowActivity(false); reset() }}
          footer={
            <>
              <Button variant="secondary" type="button" onClick={() => { setShowActivity(false); reset() }}>取消</Button>
              <Button loading={isSubmitting || addActivity.isPending} onClick={handleSubmit((d) => addActivity.mutate(d))}>保存</Button>
            </>
          }
        >
          <div className="space-y-3">
            <Select
              label="类型"
              options={toSelectOptions(activityTypeOpts)}
              {...register('activityType')}
            />
            <Textarea label="内容" {...register('description')} />
            <Input type="datetime-local" label="时间" {...register('activityDate')} />
          </div>
        </Modal>
      )}
    </div>
  )
}
