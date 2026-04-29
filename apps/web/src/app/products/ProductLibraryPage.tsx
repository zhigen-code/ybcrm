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
import { FileManager } from '@/shared/components/FileManager'
import { Pagination } from '@/shared/components/Pagination'
import type { Partner, Service } from '@/shared/types'
import { useOptionGroup, toSelectOptions, getOptionColor, getOptionLabel } from '@/shared/hooks/useOptions'

interface PartnerProduct {
  id: string
  partnerId: string
  partnerName: string
  serviceId: string
  name: string
  description: string | null
  price: number | null
  currency: string
  isActive: number
}

// ─── schemas ──────────────────────────────────────────────────────────────────

const serviceSchema = z.object({
  name: z.string().min(1, '请填写名称'),
  description: z.string().nullable().optional(),
  price: z.coerce.number().nullable().optional(),
  processSteps: z.string().optional(),
})
type ServiceForm = z.infer<typeof serviceSchema>

const partnerSchema = z.object({
  name: z.string().min(1, '请填写名称'),
  type: z.string().min(1, '请选择类型'),
  contactPerson: z.string().nullable().optional(),
  contactInfo: z.string().nullable().optional(),
  serviceScope: z.string().optional(),
})
type PartnerForm = z.infer<typeof partnerSchema>

const productSchema = z.object({
  partnerId: z.string().min(1, '请选择合作伙伴'),
  name: z.string().min(1, '请填写产品名称'),
  description: z.string().nullable().optional(),
  price: z.coerce.number().nullable().optional(),
  currency: z.string().default('USD'),
})
type ProductForm = z.infer<typeof productSchema>

// ─── 合作伙伴管理弹窗 ──────────────────────────────────────────────────────────

const PARTNER_PAGE_SIZE = 50

function PartnerManagerModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const { options: partnerTypeOpts } = useOptionGroup('partner_type')
  const [editTarget, setEditTarget] = useState<Partner | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['partners', '', page],
    queryFn: () =>
      crmApi.get<{ data: Partner[]; total: number }>('/partners', {
        params: { page, pageSize: PARTNER_PAGE_SIZE },
      }).then((r) => r.data),
  })
  const partners = data?.data ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PARTNER_PAGE_SIZE)

  const form = useForm<PartnerForm>({ resolver: zodResolver(partnerSchema) })

  const openCreate = () => {
    form.reset({ name: '', type: partnerTypeOpts[0]?.value ?? '', contactPerson: '', contactInfo: '', serviceScope: '' })
    setEditTarget(null)
    setShowForm(true)
  }

  const openEdit = (p: Partner) => {
    form.reset({ name: p.name, type: p.type, contactPerson: p.contactPerson, contactInfo: p.contactInfo, serviceScope: (p.serviceScope ?? []).join('、') })
    setEditTarget(p)
    setShowForm(true)
  }

  const saveMutation = useMutation({
    mutationFn: (body: PartnerForm) => {
      const payload = { ...body, serviceScope: body.serviceScope ? body.serviceScope.split(/[、,，]/).map((s) => s.trim()).filter(Boolean) : [] }
      return editTarget ? crmApi.put(`/partners/${editTarget.id}`, payload) : crmApi.post('/partners', payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] })
      queryClient.invalidateQueries({ queryKey: ['partners-all'] })
      setShowForm(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => crmApi.delete(`/partners/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] })
      queryClient.invalidateQueries({ queryKey: ['partners-all'] })
    },
  })

  if (showForm) {
    return (
      <Modal
        title={editTarget ? '编辑合作伙伴' : '新建合作伙伴'}
        onClose={() => setShowForm(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowForm(false)}>取消</Button>
            <Button loading={saveMutation.isPending} onClick={form.handleSubmit((d) => saveMutation.mutate(d))}>保存</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input label="名称" error={form.formState.errors.name?.message} {...form.register('name')} />
          <Select label="类型" options={toSelectOptions(partnerTypeOpts)} {...form.register('type')} />
          <Input label="联系人" {...form.register('contactPerson')} />
          <Input label="联系方式" placeholder="电话、邮箱等" {...form.register('contactInfo')} />
          <Input label="服务范围" placeholder="用逗号或顿号分隔" {...form.register('serviceScope')} />
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      title="合作伙伴管理"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>关闭</Button>
          <Button onClick={openCreate}>新建合作伙伴</Button>
        </>
      }
    >
      {isLoading ? (
        <div className="py-8 text-center text-sm text-gray-400">加载中...</div>
      ) : (
        <div className="space-y-2">
          {partners.map((p) => (
            <div key={p.id} className="flex items-center gap-2 rounded-lg border px-3 py-2">
              <Badge variant={getOptionColor(partnerTypeOpts, p.type)} className="flex-shrink-0">
                {getOptionLabel(partnerTypeOpts, p.type)}
              </Badge>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-gray-900">{p.name}</span>
                {p.contactPerson && <span className="ml-2 text-xs text-gray-400">{p.contactPerson}</span>}
              </div>
              <button onClick={() => openEdit(p)} className="text-xs text-primary-600 hover:text-primary-800">编辑</button>
              <button
                onClick={() => { if (confirm(`确认删除「${p.name}」？`)) deleteMutation.mutate(p.id) }}
                className="text-xs text-red-400 hover:text-red-600"
              >
                删除
              </button>
            </div>
          ))}
          {partners.length === 0 && <p className="py-6 text-center text-sm text-gray-400">暂无合作伙伴</p>}
        </div>
      )}
      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} total={total} pageSize={PARTNER_PAGE_SIZE} onPageChange={setPage} />
      )}
    </Modal>
  )
}

// ─── 服务卡片 ──────────────────────────────────────────────────────────────────

function ServiceCard({
  service,
  products,
  partners,
  onEdit,
  onDelete,
}: {
  service: Service
  products: PartnerProduct[]
  partners: Partner[]
  onEdit: (s: Service) => void
  onDelete: (s: Service) => void
}) {
  const queryClient = useQueryClient()
  const [showProductForm, setShowProductForm] = useState(false)
  const [editProduct, setEditProduct] = useState<PartnerProduct | null>(null)

  // 按合作伙伴分组
  const byPartner = products.reduce<Record<string, { name: string; items: PartnerProduct[] }>>((acc, p) => {
    if (!acc[p.partnerId]) acc[p.partnerId] = { name: p.partnerName, items: [] }
    acc[p.partnerId]!.items.push(p)
    return acc
  }, {})

  const productForm = useForm<ProductForm>({ resolver: zodResolver(productSchema), defaultValues: { currency: 'USD' } })

  const openAddProduct = () => {
    productForm.reset({ partnerId: '', name: '', description: '', price: null, currency: 'USD' })
    setEditProduct(null)
    setShowProductForm(true)
  }

  const openEditProduct = (p: PartnerProduct) => {
    productForm.reset({ partnerId: p.partnerId, name: p.name, description: p.description, price: p.price, currency: p.currency })
    setEditProduct(p)
    setShowProductForm(true)
  }

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['partner-products-all'] })
    queryClient.invalidateQueries({ queryKey: ['partner-products-by-service'] })
    queryClient.invalidateQueries({ queryKey: ['partner-products', 'active'] })
  }

  const saveProduct = useMutation({
    mutationFn: (body: ProductForm) =>
      editProduct
        ? crmApi.put(`/partner-products/${editProduct.id}`, body)
        : crmApi.post('/partner-products', { ...body, serviceId: service.id }),
    onSuccess: () => { setShowProductForm(false); setEditProduct(null); invalidate() },
  })

  const deleteProduct = useMutation({
    mutationFn: (id: string) => crmApi.delete(`/partner-products/${id}`),
    onSuccess: invalidate,
  })

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      crmApi.put(`/partner-products/${id}`, { isActive }),
    onSuccess: invalidate,
  })

  const partnerOptions = partners.map((p) => ({ value: p.id, label: p.name }))

  return (
    <div className="rounded-xl border overflow-hidden">
      {/* 服务头部 */}
      <div className="bg-white px-4 py-3 border-b flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-base font-semibold text-gray-900">{service.name}</h2>
            {service.price != null && (
              <span className="text-sm font-medium text-primary-600">¥{service.price.toLocaleString()}</span>
            )}
          </div>
          {service.description && (
            <p className="mt-0.5 text-sm text-gray-500">{service.description}</p>
          )}
          {(service.processSteps ?? []).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1">
              {(service.processSteps ?? []).map((step, i) => (
                <span key={i} className="inline-flex items-center gap-1 text-xs text-gray-500">
                  <span className="w-4 h-4 rounded-full bg-primary-100 text-primary-700 text-center leading-4 flex-shrink-0 font-medium">{i + 1}</span>
                  {step}
                  {i < (service.processSteps ?? []).length - 1 && <span className="text-gray-300">→</span>}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <Button variant="ghost" size="sm" onClick={() => onEdit(service)}>编辑</Button>
          <Button
            variant="ghost" size="sm"
            onClick={() => { if (confirm(`确认删除「${service.name}」？`)) onDelete(service) }}
            className="text-red-500 hover:text-red-700"
          >
            删除
          </Button>
        </div>
      </div>

      {/* 主体：产品 + 服务资料 */}
      <div className="bg-gray-50 grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-gray-200">
        {/* 产品列表（占 2/3） */}
        <div className="lg:col-span-2 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-600">
              可选产品
              {products.length > 0 && (
                <span className="ml-1.5 text-xs text-gray-400 font-normal">
                  共 {products.length} 个，来自 {Object.keys(byPartner).length} 家合作伙伴
                </span>
              )}
            </p>
            <button
              onClick={openAddProduct}
              className="text-xs text-primary-600 hover:text-primary-800 font-medium"
            >
              + 添加产品
            </button>
          </div>

          {products.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">暂无产品，点击右上方添加</p>
          ) : (
            <div className="space-y-4">
              {Object.values(byPartner).map((group) => (
                <div key={group.name}>
                  <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block" />
                    {group.name}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {group.items.map((p) => (
                      <div key={p.id} className={`rounded-lg border bg-white overflow-hidden ${p.isActive ? '' : 'opacity-60'}`}>
                        <div className="px-3 pt-3 pb-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <span className="font-medium text-sm text-gray-900 leading-snug">{p.name}</span>
                              {!p.isActive && <span className="ml-1.5 text-xs text-gray-400">（已禁用）</span>}
                            </div>
                            {p.price != null && (
                              <span className="text-sm font-semibold text-primary-600 flex-shrink-0">
                                {p.currency} {p.price.toLocaleString()}
                              </span>
                            )}
                          </div>
                          {p.description && (
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{p.description}</p>
                          )}
                          <div className="flex gap-2 mt-1.5">
                            <button onClick={() => openEditProduct(p)} className="text-xs text-primary-600 hover:text-primary-800">编辑</button>
                            <button
                              onClick={() => toggleActive.mutate({ id: p.id, isActive: !p.isActive })}
                              className="text-xs text-gray-400 hover:text-gray-600"
                            >
                              {p.isActive ? '禁用' : '启用'}
                            </button>
                            <button
                              onClick={() => { if (confirm(`确认删除「${p.name}」？`)) deleteProduct.mutate(p.id) }}
                              className="text-xs text-red-400 hover:text-red-600"
                            >
                              删除
                            </button>
                          </div>
                        </div>
                        <div className="border-t bg-gray-50 px-3 py-2">
                          <FileManager entityType="product" entityId={p.id} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 服务资料（占 1/3） */}
        <div className="p-4">
          <p className="text-sm font-medium text-gray-600 mb-3">服务资料</p>
          <FileManager entityType="service" entityId={service.id} />
        </div>
      </div>

      {/* 产品弹窗 */}
      {showProductForm && (
        <Modal
          title={editProduct ? '编辑产品' : '添加产品'}
          onClose={() => { setShowProductForm(false); setEditProduct(null) }}
          footer={
            <>
              <Button variant="secondary" onClick={() => { setShowProductForm(false); setEditProduct(null) }}>取消</Button>
              <Button loading={saveProduct.isPending} onClick={productForm.handleSubmit((d) => saveProduct.mutate(d))}>保存</Button>
            </>
          }
        >
          <div className="space-y-3">
            <Select
              label="合作伙伴"
              options={partnerOptions}
              error={productForm.formState.errors.partnerId?.message}
              {...productForm.register('partnerId')}
            />
            <Input label="产品名称" error={productForm.formState.errors.name?.message} {...productForm.register('name')} />
            <Textarea label="描述" rows={2} {...productForm.register('description')} />
            <div className="flex gap-2">
              <Input label="价格" type="number" className="flex-1" {...productForm.register('price')} />
              <div className="w-24">
                <label className="block text-sm font-medium text-gray-700 mb-1">货币</label>
                <select className="w-full rounded-md border border-gray-300 px-2.5 py-2 text-sm" {...productForm.register('currency')}>
                  <option value="USD">USD</option>
                  <option value="CNY">CNY</option>
                  <option value="EUR">EUR</option>
                  <option value="HKD">HKD</option>
                </select>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── 主页面 ────────────────────────────────────────────────────────────────────

export default function ProductLibraryPage() {
  const queryClient = useQueryClient()
  const [showPartnerManager, setShowPartnerManager] = useState(false)
  const [showServiceForm, setShowServiceForm] = useState(false)
  const [editService, setEditService] = useState<Service | null>(null)

  const { data: servicesData, isLoading } = useQuery({
    queryKey: ['services'],
    queryFn: () => crmApi.get<{ data: Service[] }>('/services').then((r) => r.data),
  })
  const services = servicesData?.data ?? []

  const { data: productsData } = useQuery({
    queryKey: ['partner-products-all'],
    queryFn: () => crmApi.get<{ data: PartnerProduct[] }>('/partner-products').then((r) => r.data),
    staleTime: 1000 * 30,
  })
  const allProducts = productsData?.data ?? []

  const { data: partnersData } = useQuery({
    queryKey: ['partners-all'],
    queryFn: () => crmApi.get<{ data: Partner[] }>('/partners', { params: { pageSize: 200 } }).then((r) => r.data),
    staleTime: 1000 * 60 * 5,
  })
  const allPartners = partnersData?.data ?? []

  const productsByService = allProducts.reduce<Record<string, PartnerProduct[]>>((acc, p) => {
    if (!acc[p.serviceId]) acc[p.serviceId] = []
    acc[p.serviceId]!.push(p)
    return acc
  }, {})

  const serviceForm = useForm<ServiceForm>({ resolver: zodResolver(serviceSchema) })

  const openCreate = () => {
    serviceForm.reset({ name: '', description: '', price: null, processSteps: '' })
    setEditService(null)
    setShowServiceForm(true)
  }

  const openEdit = (s: Service) => {
    serviceForm.reset({ name: s.name, description: s.description, price: s.price, processSteps: (s.processSteps ?? []).join('\n') })
    setEditService(s)
    setShowServiceForm(true)
  }

  const saveService = useMutation({
    mutationFn: (body: ServiceForm) => {
      const payload = { ...body, processSteps: body.processSteps ? body.processSteps.split('\n').map((s) => s.trim()).filter(Boolean) : [] }
      return editService ? crmApi.put(`/services/${editService.id}`, payload) : crmApi.post('/services', payload)
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['services'] }); setShowServiceForm(false) },
  })

  const deleteService = useMutation({
    mutationFn: (id: string) => crmApi.delete(`/services/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['services'] }),
  })

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">产品库</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowPartnerManager(true)}>合作伙伴</Button>
          <Button onClick={openCreate}>新建服务</Button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-gray-500">加载中...</div>
      ) : services.length === 0 ? (
        <div className="py-12 text-center text-sm text-gray-400">暂无服务，点击右上方新建</div>
      ) : (
        <div className="space-y-6">
          {services.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              products={productsByService[service.id] ?? []}
              partners={allPartners}
              onEdit={openEdit}
              onDelete={(s) => deleteService.mutate(s.id)}
            />
          ))}
        </div>
      )}

      {showPartnerManager && <PartnerManagerModal onClose={() => setShowPartnerManager(false)} />}

      {showServiceForm && (
        <Modal
          title={editService ? '编辑服务' : '新建服务'}
          onClose={() => setShowServiceForm(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setShowServiceForm(false)}>取消</Button>
              <Button loading={saveService.isPending} onClick={serviceForm.handleSubmit((d) => saveService.mutate(d))}>保存</Button>
            </>
          }
        >
          <div className="space-y-3">
            <Input label="名称" error={serviceForm.formState.errors.name?.message} {...serviceForm.register('name')} />
            <Textarea label="描述" {...serviceForm.register('description')} />
            <Input label="价格（元）" type="number" {...serviceForm.register('price')} />
            <Textarea label="服务流程（每行一个步骤）" rows={5} placeholder={'初步咨询\n医疗评估\n方案制定'} {...serviceForm.register('processSteps')} />
          </div>
        </Modal>
      )}
    </div>
  )
}
