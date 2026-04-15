import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { crmApi } from '@/shared/utils/request'
import { Button } from '@/shared/components/Button'
import { Badge } from '@/shared/components/Badge'
import { formatDate } from '@/shared/utils/format'
import { useOptionGroup, getOptionLabel } from '@/shared/hooks/useOptions'
import { ActivityModal } from '@/shared/components/ActivityModal'
import type { ActivitySubmitData } from '@/shared/components/ActivityModal'
import { AttachmentList } from '@/shared/components/AttachmentList'
import { useCrmAuth } from '@/app/auth/CrmAuthContext'
import type { Lead, LeadStatus, SalesActivity, User } from '@/shared/types'
import { useState } from 'react'

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user: me } = useCrmAuth()
  const [showActivity, setShowActivity] = useState(false)
  const [assigningUserId, setAssigningUserId] = useState<string | null | undefined>(undefined)

  const canAssign = me?.role === 'admin' || me?.role === 'operations'

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

  // 用于分配负责人的用户列表（仅 sales 角色）
  const { data: usersData } = useQuery({
    queryKey: ['users-sales'],
    queryFn: () =>
      crmApi.get<{ data: User[] }>('/users').then((r) =>
        r.data.data.filter((u) => u.role === 'sales'),
      ),
    enabled: canAssign,
  })
  const salesUsers = usersData ?? []

  const updateStatus = useMutation({
    mutationFn: (status: LeadStatus) => crmApi.put(`/leads/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lead', id] }),
  })

  const assignLead = useMutation({
    mutationFn: (assignedToUserId: string | null) =>
      crmApi.put(`/leads/${id}`, { assignedToUserId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', id] })
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      setAssigningUserId(undefined)
    },
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

  const _downloadFile = async (key: string, name: string) => {
    const res = await crmApi.get('/upload/file', { params: { key }, responseType: 'blob' })
    const url = URL.createObjectURL(res.data as Blob)
    const a = document.createElement('a')
    a.href = url; a.download = name; a.click()
    URL.revokeObjectURL(url)
  }

  const addActivity = useMutation({
    mutationFn: (body: ActivitySubmitData) => crmApi.post('/activities', { ...body, leadId: id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities', 'lead', id] })
      setShowActivity(false)
    },
  })

  if (!lead) return <div className="p-6 text-sm text-gray-500">加载中...</div>

  // 判断是否正在编辑分配：undefined=未进入编辑，null=选择"取消分配"，string=选择了某用户
  const isEditingAssign = assigningUserId !== undefined

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

        {/* 负责人行 */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-600">负责人：</span>
          {!isEditingAssign ? (
            <>
              <span className={`text-sm ${lead.assignedToName ? 'font-medium text-gray-900' : 'text-gray-400'}`}>
                {lead.assignedToName ?? '未分配'}
              </span>
              {canAssign && (
                <button
                  onClick={() => setAssigningUserId(lead.assignedToUserId ?? null)}
                  className="text-xs text-primary-600 hover:text-primary-800 underline"
                >
                  {lead.assignedToUserId ? '变更' : '分配'}
                </button>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2">
              <select
                className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={assigningUserId ?? ''}
                onChange={(e) => setAssigningUserId(e.target.value || null)}
              >
                <option value="">— 取消分配 —</option>
                {salesUsers.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
              <Button
                size="sm"
                loading={assignLead.isPending}
                onClick={() => assignLead.mutate(assigningUserId ?? null)}
              >
                确认
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setAssigningUserId(undefined)}
              >
                取消
              </Button>
            </div>
          )}
        </div>

        {lead.notes && (
          <p className="mt-3 text-sm text-gray-600 bg-gray-50 rounded p-3">{lead.notes}</p>
        )}

        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
          <span>创建人：{lead.createdByName ?? '—'}</span>
          <span>创建于 {formatDate(lead.createdAt)}</span>
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
                  <AttachmentList attachments={act.attachments ?? []} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
