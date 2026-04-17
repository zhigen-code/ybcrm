import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { crmApi } from '@/shared/utils/request'
import { Button } from '@/shared/components/Button'
import { Input } from '@/shared/components/Input'
import { Select } from '@/shared/components/Select'
import { Badge } from '@/shared/components/Badge'
import { Modal } from '@/shared/components/Modal'
import { formatDate } from '@/shared/utils/format'
import type { Client, SalesActivity, Service } from '@/shared/types'
import { useOptionGroup, toSelectOptions, getOptionColor, getOptionLabel } from '@/shared/hooks/useOptions'
import { ActivityModal } from '@/shared/components/ActivityModal'
import type { ActivitySubmitData } from '@/shared/components/ActivityModal'
import { AttachmentList } from '@/shared/components/AttachmentList'

const editSchema = z.object({
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  servicePlans: z.array(z.string()).optional(),
  contractStatus: z.string().nullable().optional(),
})
type EditForm = z.infer<typeof editSchema>

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showEdit, setShowEdit] = useState(false)
  const [showActivity, setShowActivity] = useState(false)

  const { options: contractStatusOpts } = useOptionGroup('contract_status')
  const { options: activityTypeOpts } = useOptionGroup('activity_type')

  const { data: servicesData } = useQuery({
    queryKey: ['services'],
    queryFn: () => crmApi.get<{ data: Service[] }>('/services').then((r) => r.data),
  })
  const serviceOptions = servicesData?.data ?? []

  const { data: client } = useQuery({
    queryKey: ['client', id],
    queryFn: () => crmApi.get<{ data: Client }>(`/clients/${id}`).then((r) => r.data.data),
  })

  const { data: activities } = useQuery({
    queryKey: ['activities', 'client', id, client?.leadId],
    enabled: !!client,
    queryFn: () =>
      crmApi.get<{ data: SalesActivity[] }>('/activities', {
        params: { clientId: id, ...(client?.leadId ? { leadId: client.leadId } : {}) },
      }).then((r) => r.data.data),
  })

  const editForm = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    ...(client ? {
      values: {
        phone: client.phone,
        email: client.email,
        servicePlans: client.servicePlans ?? [],
        contractStatus: client.contractStatus,
      }
    } : {}),
  })

  const selectedPlans = editForm.watch('servicePlans') ?? []

  const togglePlan = (svcName: string) => {
    const next = selectedPlans.includes(svcName)
      ? selectedPlans.filter((s) => s !== svcName)
      : [...selectedPlans, svcName]
    editForm.setValue('servicePlans', next)
  }

  const updateClient = useMutation({
    mutationFn: (body: EditForm) => crmApi.put(`/clients/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', id] })
      setShowEdit(false)
    },
  })

  const _downloadFile = async (key: string, name: string) => {
    const res = await crmApi.get('/upload/file', { params: { key }, responseType: 'blob' })
    const url = URL.createObjectURL(res.data as Blob)
    const a = document.createElement('a')
    a.href = url; a.download = name; a.click()
    URL.revokeObjectURL(url)
  }

  const addActivity = useMutation({
    mutationFn: (body: ActivitySubmitData) => crmApi.post('/activities', { ...body, clientId: id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities', 'client', id] })
      setShowActivity(false)
    },
  })

  if (!client) return <div className="p-6 text-sm text-gray-500">加载中...</div>

  return (
    <div className="p-4 sm:p-6 max-w-3xl">
      <button onClick={() => navigate(-1)} className="mb-4 text-sm text-gray-500 hover:text-gray-700">
        ← 返回
      </button>

      {/* 基本信息卡片 */}
      <div className="rounded-lg border bg-white p-4 sm:p-6 mb-4 sm:mb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-gray-900">{client.name}</h1>
              {client.leadNo != null && (
                <span className="font-mono text-sm text-gray-400">L-{String(client.leadNo).padStart(4, '0')}</span>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {client.phone ?? '无电话'} · {client.email ?? '无邮箱'}
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setShowEdit(true)}>
            编辑
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-500">服务套餐</span>
            <div className="mt-0.5 flex flex-wrap gap-1">
              {(client.servicePlans ?? []).length > 0
                ? (client.servicePlans ?? []).map((p) => <Badge key={p} variant="blue">{p}</Badge>)
                : <span className="text-gray-400">—</span>}
            </div>
          </div>
          <div>
            <span className="text-gray-500">合同状态</span>
            <p className="mt-0.5">
              {client.contractStatus ? (
                <Badge variant={getOptionColor(contractStatusOpts, client.contractStatus)}>
                  {client.contractStatus}
                </Badge>
              ) : '—'}
            </p>
          </div>
          {client.detailedProfile?.source && (
            <div>
              <span className="text-gray-500">来源</span>
              <p className="mt-0.5 text-gray-700">{String(client.detailedProfile.source)}</p>
            </div>
          )}
          <div>
            <span className="text-gray-500">创建人</span>
            <p className="mt-0.5 text-gray-700">{client.createdByName ?? '—'}</p>
          </div>
          <div>
            <span className="text-gray-500">创建时间</span>
            <p className="mt-0.5 text-gray-700">{formatDate(client.createdAt)}</p>
          </div>
          <div>
            <span className="text-gray-500">更新时间</span>
            <p className="mt-0.5 text-gray-700">{formatDate(client.updatedAt)}</p>
          </div>
        </div>

        {client.detailedProfile?.notes && (
          <p className="mt-3 text-sm text-gray-600 bg-gray-50 rounded p-3">{String(client.detailedProfile.notes)}</p>
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
              <div key={act.id} className="flex gap-3 text-sm border-l-2 border-gray-200 pl-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-gray-600">
                      {getOptionLabel(activityTypeOpts, act.activityType)}
                    </span>
                    <span className="text-xs text-gray-400">{act.userName ?? '—'}</span>
                    <span className="text-xs text-gray-400">{formatDate(act.activityDate)}</span>
                  </div>
                  {act.description && (
                    <p className="mt-1 text-gray-700 whitespace-pre-line">{act.description}</p>
                  )}
                  <AttachmentList attachments={act.attachments ?? []} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 编辑弹窗 */}
      {showEdit && (
        <Modal
          title="编辑客户信息"
          onClose={() => setShowEdit(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setShowEdit(false)}>取消</Button>
              <Button
                loading={updateClient.isPending}
                onClick={editForm.handleSubmit((d) => updateClient.mutate(d))}
              >
                保存
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            <Input label="电话" {...editForm.register('phone')} />
            <Input label="邮箱" type="email" {...editForm.register('email')} />
            <div>
              <p className="mb-1.5 text-sm font-medium text-gray-700">服务套餐</p>
              <div className="flex flex-wrap gap-2">
                {serviceOptions.map((svc) => (
                  <button
                    key={svc.id}
                    type="button"
                    onClick={() => togglePlan(svc.name)}
                    className={`rounded-full px-3 py-1 text-sm font-medium border transition-colors ${
                      selectedPlans.includes(svc.name)
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-primary-400'
                    }`}
                  >
                    {svc.name}
                  </button>
                ))}
              </div>
            </div>
            <Select
              label="合同状态"
              options={toSelectOptions(contractStatusOpts)}
              placeholder="请选择..."
              {...editForm.register('contractStatus')}
            />
          </div>
        </Modal>
      )}

      {/* 添加跟进记录弹窗 */}
      {showActivity && (
        <ActivityModal
          title="添加跟进记录"
          onClose={() => setShowActivity(false)}
          loading={addActivity.isPending}
          onSubmit={(d) => addActivity.mutate(d)}
        />
      )}
    </div>
  )
}
