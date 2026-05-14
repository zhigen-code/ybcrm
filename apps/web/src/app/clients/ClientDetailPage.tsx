import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { crmApi } from '@/shared/utils/request'
import { Button } from '@/shared/components/Button'
import { Input } from '@/shared/components/Input'
import { Select } from '@/shared/components/Select'
import { Badge } from '@/shared/components/Badge'
import { Modal } from '@/shared/components/Modal'
import { formatDate } from '@/shared/utils/format'
import type { Client, SalesActivity, Service } from '@/shared/types'
import { useOptionGroup, toSelectOptions, getOptionColor, getOptionLabel, parseActivityMeta } from '@/shared/hooks/useOptions'
import { ActivityModal } from '@/shared/components/ActivityModal'
import type { ActivitySubmitData } from '@/shared/components/ActivityModal'
import { AttachmentList } from '@/shared/components/AttachmentList'
import { AiAnalysisCard } from '@/shared/components/AiAnalysisCard'

const editSchema = z.object({
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  servicePlans: z.array(z.string()).optional(),
  contractStatus: z.string().nullable().optional(),
})
type EditForm = z.infer<typeof editSchema>

export default function ClientDetailPage() {
  const { t } = useTranslation()
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

  if (!client) return <div className="p-6 text-sm text-gray-500">{t('common.loading')}</div>

  return (
    <div className="p-4 sm:p-6 max-w-3xl">
      <button onClick={() => navigate(-1)} className="mb-4 text-sm text-gray-500 hover:text-gray-700">
        ← {t('common.back')}
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
              {client.phone ?? t('clients.detail.noPhone')} · {client.email ?? t('clients.detail.noEmail')}
            </p>
          </div>
          <div className="flex flex-wrap gap-1 max-w-[50%] justify-end">
            {(client.servicePlans ?? []).map((p) => <Badge key={p} variant="blue">{p}</Badge>)}
          </div>
        </div>

        {/* 合同状态 */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-600">{t('clients.detail.contractStatus')}</span>
          {client.contractStatus ? (
            <Badge variant={getOptionColor(contractStatusOpts, client.contractStatus)}>
              {getOptionLabel(contractStatusOpts, client.contractStatus)}
            </Badge>
          ) : (
            <span className="text-sm text-gray-400">{t('clients.detail.notSet')}</span>
          )}
          <button
            onClick={() => setShowEdit(true)}
            className="text-xs text-primary-600 hover:text-primary-800 underline"
          >
            {t('common.edit')}
          </button>
        </div>

        {client.detailedProfile?.notes && (
          <p className="mt-3 text-sm text-gray-600 bg-gray-50 rounded p-3">{String(client.detailedProfile.notes)}</p>
        )}

        {/* 附加字段：下次联系 */}
        {client.nextContactDate && (
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
            <span className="text-gray-600">
              {t('clients.detail.nextContact')}<span className="font-medium text-gray-900">{formatDate(client.nextContactDate)}</span>
            </span>
          </div>
        )}

        {/* 元信息 */}
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
          {client.detailedProfile?.source && <span>{t('clients.detail.source')}{String(client.detailedProfile.source)}</span>}
          <span>{t('leads.detail.createdBy')}{client.createdByName ?? '—'}</span>
          <span>{t('leads.detail.createdAt')} {formatDate(client.createdAt)}</span>
        </div>
      </div>

      {/* 跟进记录 */}
      <div className="rounded-lg border bg-white p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">{t('clients.detail.activities')}</h2>
          <Button size="sm" variant="secondary" onClick={() => setShowActivity(true)}>
            {t('clients.detail.addActivity')}
          </Button>
        </div>

        {!activities?.length ? (
          <p className="text-sm text-gray-500">{t('clients.detail.noActivities')}</p>
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
                  {act.nextContactDate && (
                    <p className="mt-1 text-xs text-primary-600">{t('clients.detail.nextContact')}{formatDate(act.nextContactDate)}</p>
                  )}
                  {act.extraData && Object.keys(act.extraData).length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5">
                      {Object.entries(act.extraData as Record<string, unknown>).map(([k, v]) => {
                        const field = parseActivityMeta(activityTypeOpts.find((o) => o.value === act.activityType) ?? {} as Parameters<typeof parseActivityMeta>[0])?.fields?.find((f) => f.key === k)
                        return (
                          <span key={k} className="text-xs text-gray-500">
                            {field?.label ?? k}：<span className="font-medium text-gray-800">{String(v)}{field?.unit ? ` ${field.unit}` : ''}</span>
                          </span>
                        )
                      })}
                    </div>
                  )}
                  <AttachmentList attachments={act.attachments ?? []} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI 分析 */}
      <AiAnalysisCard
        entityType="client"
        entityId={id!}
        onActionExecuted={() => {
          queryClient.invalidateQueries({ queryKey: ['client', id] })
          queryClient.invalidateQueries({ queryKey: ['activities', 'client', id] })
        }}
      />

      {/* 编辑弹窗 */}
      {showEdit && (
        <Modal
          title={t('clients.detail.editTitle')}
          onClose={() => setShowEdit(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setShowEdit(false)}>{t('common.cancel')}</Button>
              <Button
                loading={updateClient.isPending}
                onClick={editForm.handleSubmit((d) => updateClient.mutate(d))}
              >
                {t('common.save')}
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            <Input label={t('common.phone')} {...editForm.register('phone')} />
            <Input label={t('common.email')} type="email" {...editForm.register('email')} />
            <div>
              <p className="mb-1.5 text-sm font-medium text-gray-700">{t('clients.cols.plan')}</p>
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
              label={t('clients.cols.contractStatus')}
              options={toSelectOptions(contractStatusOpts)}
              placeholder={t('clients.detail.planPlaceholder')}
              value={editForm.watch('contractStatus') ?? ''}
              onChange={(e) => editForm.setValue('contractStatus', e.target.value || null)}
            />
          </div>
        </Modal>
      )}

      {/* 添加跟进记录弹窗 */}
      {showActivity && (
        <ActivityModal
          title={t('activityModal.title')}
          onClose={() => setShowActivity(false)}
          loading={addActivity.isPending}
          onSubmit={(d) => addActivity.mutate(d)}
          showNextContact
          entityType="client"
        />
      )}
    </div>
  )
}
