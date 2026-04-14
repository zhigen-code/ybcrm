import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { crmApi } from '@/shared/utils/request'
import { Button } from '@/shared/components/Button'
import { Input } from '@/shared/components/Input'
import { Select } from '@/shared/components/Select'
import { Textarea } from '@/shared/components/Textarea'
import { Modal } from '@/shared/components/Modal'
import { Badge } from '@/shared/components/Badge'
import type { Partner, PartnerType } from '@/shared/types'

const typeLabel: Record<PartnerType, string> = {
  FertilityCenter: '生殖中心',
  SurrogacyAgency: '代孕机构',
  EggDonationAgency: '供卵机构',
}
const typeBadge: Record<PartnerType, 'blue' | 'purple' | 'green'> = {
  FertilityCenter: 'blue',
  SurrogacyAgency: 'purple',
  EggDonationAgency: 'green',
}

const schema = z.object({
  name: z.string().min(1, '请填写名称'),
  type: z.enum(['FertilityCenter', 'SurrogacyAgency', 'EggDonationAgency']),
  contactPerson: z.string().nullable().optional(),
  contactInfo: z.string().nullable().optional(),
  serviceScope: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function PartnersPage() {
  const queryClient = useQueryClient()
  const [editTarget, setEditTarget] = useState<Partner | null>(null)
  const [showForm, setShowForm] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['partners'],
    queryFn: () => crmApi.get<{ data: Partner[] }>('/partners').then((r) => r.data),
  })

  const form = useForm<FormData>({ resolver: zodResolver(schema) })

  const openCreate = () => {
    form.reset({ name: '', type: 'FertilityCenter', contactPerson: '', contactInfo: '', serviceScope: '' })
    setEditTarget(null)
    setShowForm(true)
  }

  const openEdit = (p: Partner) => {
    form.reset({
      name: p.name,
      type: p.type,
      contactPerson: p.contactPerson,
      contactInfo: p.contactInfo,
      serviceScope: p.serviceScope.join('、'),
    })
    setEditTarget(p)
    setShowForm(true)
  }

  const saveMutation = useMutation({
    mutationFn: (body: FormData) => {
      const payload = {
        ...body,
        serviceScope: body.serviceScope
          ? body.serviceScope.split(/[、,，]/).map((s) => s.trim()).filter(Boolean)
          : [],
      }
      return editTarget
        ? crmApi.put(`/partners/${editTarget.id}`, payload)
        : crmApi.post('/partners', payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] })
      setShowForm(false)
    },
  })

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">合作伙伴</h1>
        <Button onClick={openCreate}>新建合作伙伴</Button>
      </div>

      {isLoading ? (
        <div className="text-sm text-gray-500">加载中...</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data?.data.map((partner) => (
            <div key={partner.id} className="rounded-lg border bg-white p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant={typeBadge[partner.type]}>{typeLabel[partner.type]}</Badge>
                  </div>
                  <h2 className="mt-1.5 font-semibold text-gray-900 truncate">{partner.name}</h2>
                </div>
                <Button variant="ghost" size="sm" onClick={() => openEdit(partner)}>
                  编辑
                </Button>
              </div>

              {(partner.contactPerson || partner.contactInfo) && (
                <div className="mt-3 text-sm text-gray-600">
                  {partner.contactPerson && <p>联系人：{partner.contactPerson}</p>}
                  {partner.contactInfo && <p className="text-gray-500">{partner.contactInfo}</p>}
                </div>
              )}

              {partner.serviceScope.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {partner.serviceScope.map((s) => (
                    <span key={s} className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <Modal
          title={editTarget ? '编辑合作伙伴' : '新建合作伙伴'}
          onClose={() => setShowForm(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setShowForm(false)}>取消</Button>
              <Button
                loading={saveMutation.isPending}
                onClick={form.handleSubmit((d) => saveMutation.mutate(d))}
              >
                保存
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            <Input label="名称" error={form.formState.errors.name?.message} {...form.register('name')} />
            <Select
              label="类型"
              options={[
                { value: 'FertilityCenter', label: '生殖中心' },
                { value: 'SurrogacyAgency', label: '代孕机构' },
                { value: 'EggDonationAgency', label: '供卵机构' },
              ]}
              {...form.register('type')}
            />
            <Input label="联系人" {...form.register('contactPerson')} />
            <Input label="联系方式" placeholder="电话、邮箱等" {...form.register('contactInfo')} />
            <Input
              label="服务范围"
              placeholder="用逗号或顿号分隔，如：赴美试管、代孕"
              {...form.register('serviceScope')}
            />
          </div>
        </Modal>
      )}
    </div>
  )
}
