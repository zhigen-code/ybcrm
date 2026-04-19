import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { crmApi } from '@/shared/utils/request'
import { Button } from '@/shared/components/Button'
import { Input } from '@/shared/components/Input'
import { Textarea } from '@/shared/components/Textarea'
import { Modal } from '@/shared/components/Modal'
import { FileManager } from '@/shared/components/FileManager'
import type { Service } from '@/shared/types'

const schema = z.object({
  name: z.string().min(1, '请填写名称'),
  description: z.string().nullable().optional(),
  price: z.coerce.number().nullable().optional(),
  processSteps: z.string().optional(), // 换行分隔，提交时转数组
})
type FormData = z.infer<typeof schema>

export default function ServicesPage() {
  const queryClient = useQueryClient()
  const [editTarget, setEditTarget] = useState<Service | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['services'],
    queryFn: () => crmApi.get<{ data: Service[] }>('/services').then((r) => r.data),
  })

  const form = useForm<FormData>({ resolver: zodResolver(schema) })

  const openCreate = () => {
    form.reset({ name: '', description: '', price: null, processSteps: '' })
    setEditTarget(null)
    setShowCreate(true)
  }

  const openEdit = (s: Service) => {
    form.reset({
      name: s.name,
      description: s.description,
      price: s.price,
      processSteps: (s.processSteps ?? []).join('\n'),
    })
    setEditTarget(s)
    setShowCreate(true)
  }

  const saveMutation = useMutation({
    mutationFn: (body: FormData) => {
      const payload = {
        ...body,
        processSteps: body.processSteps
          ? body.processSteps.split('\n').map((s) => s.trim()).filter(Boolean)
          : [],
      }
      return editTarget
        ? crmApi.put(`/services/${editTarget.id}`, payload)
        : crmApi.post('/services', payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] })
      setShowCreate(false)
    },
  })

  const deleteService = useMutation({
    mutationFn: (id: string) => crmApi.delete(`/services/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['services'] }),
  })

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">服务管理</h1>
        <Button onClick={openCreate}>新建服务</Button>
      </div>

      {isLoading ? (
        <div className="text-sm text-gray-500">加载中...</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {(data?.data ?? []).map((service) => (
            <div key={service.id} className="rounded-lg border bg-white p-5">
              <div className="flex items-start justify-between">
                <h2 className="font-semibold text-gray-900">{service.name}</h2>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(service)}>编辑</Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { if (confirm(`确认删除服务「${service.name}」？`)) deleteService.mutate(service.id) }}
                    className="text-red-500 hover:text-red-700"
                  >
                    删除
                  </Button>
                </div>
              </div>
              {service.description && (
                <p className="mt-1 text-sm text-gray-500">{service.description}</p>
              )}
              {service.price != null && (
                <p className="mt-2 text-sm font-medium text-primary-600">
                  ¥{service.price.toLocaleString()}
                </p>
              )}
              {(service.processSteps ?? []).length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-gray-500 mb-1">服务流程</p>
                  <ol className="space-y-1">
                    {(service.processSteps ?? []).map((step, i) => (
                      <li key={i} className="flex gap-2 text-xs text-gray-600">
                        <span className="flex-shrink-0 w-4 h-4 rounded-full bg-primary-100 text-primary-700 text-center leading-4 font-medium">
                          {i + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-500 mb-2">资料文件</p>
                <FileManager entityType="service" entityId={service.id} />
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <Modal
          title={editTarget ? '编辑服务' : '新建服务'}
          onClose={() => setShowCreate(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setShowCreate(false)}>取消</Button>
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
            <Textarea label="描述" {...form.register('description')} />
            <Input label="价格（元）" type="number" {...form.register('price')} />
            <Textarea
              label="服务流程（每行一个步骤）"
              rows={5}
              placeholder="初步咨询&#10;医疗评估&#10;方案制定"
              {...form.register('processSteps')}
            />
          </div>
        </Modal>
      )}
    </div>
  )
}
