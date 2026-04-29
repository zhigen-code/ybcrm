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
import { cn } from '@/shared/utils/cn'

const PAGE_SIZE = 20

interface PartnerProduct {
  id: string
  partnerId: string
  partnerName: string
  serviceId: string
  serviceName: string
  name: string
  description: string | null
  price: number | null
  currency: string
  isActive: number
}

// ─── Tab 切换 ──────────────────────────────────────────────────────────────────

type Tab = 'products' | 'partners' | 'services'

const TABS: { key: Tab; label: string }[] = [
  { key: 'products', label: '产品' },
  { key: 'partners', label: '合作伙伴' },
  { key: 'services', label: '服务' },
]

// ─── 产品 Tab ──────────────────────────────────────────────────────────────────

const productSchema = z.object({
  partnerId: z.string().min(1, '请选择合作伙伴'),
  serviceId: z.string().min(1, '请选择关联服务'),
  name: z.string().min(1, '请填写产品名称'),
  description: z.string().nullable().optional(),
  price: z.coerce.number().nullable().optional(),
  currency: z.string().default('USD'),
})
type ProductForm = z.infer<typeof productSchema>

function ProductsTab() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [filterService, setFilterService] = useState('')
  const [filterPartner, setFilterPartner] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<PartnerProduct | null>(null)

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['partner-products', 'all'],
    queryFn: () => crmApi.get<{ data: PartnerProduct[] }>('/partner-products').then((r) => r.data),
    staleTime: 1000 * 30,
  })
  const allProducts = productsData?.data ?? []

  const { data: servicesData } = useQuery({
    queryKey: ['services'],
    queryFn: () => crmApi.get<{ data: Service[] }>('/services').then((r) => r.data),
    staleTime: 1000 * 60 * 5,
  })
  const services = servicesData?.data ?? []

  const { data: partnersData } = useQuery({
    queryKey: ['partners-all'],
    queryFn: () => crmApi.get<{ data: Partner[] }>('/partners', { params: { pageSize: 200 } }).then((r) => r.data),
    staleTime: 1000 * 60 * 5,
  })
  const partners = partnersData?.data ?? []

  const filtered = allProducts.filter((p) => {
    if (filterService && p.serviceId !== filterService) return false
    if (filterPartner && p.partnerId !== filterPartner) return false
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.partnerName.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const form = useForm<ProductForm>({ resolver: zodResolver(productSchema), defaultValues: { currency: 'USD' } })

  const openCreate = () => {
    form.reset({ partnerId: '', serviceId: '', name: '', description: '', price: null, currency: 'USD' })
    setEditTarget(null)
    setShowForm(true)
  }

  const openEdit = (p: PartnerProduct) => {
    form.reset({ partnerId: p.partnerId, serviceId: p.serviceId, name: p.name, description: p.description, price: p.price, currency: p.currency })
    setEditTarget(p)
    setShowForm(true)
  }

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['partner-products'] })
    queryClient.invalidateQueries({ queryKey: ['partner-products-by-service'] })
    queryClient.invalidateQueries({ queryKey: ['partner-products', 'active'] })
  }

  const saveMutation = useMutation({
    mutationFn: (body: ProductForm) =>
      editTarget ? crmApi.put(`/partner-products/${editTarget.id}`, body) : crmApi.post('/partner-products', body),
    onSuccess: () => { setShowForm(false); setEditTarget(null); invalidate() },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => crmApi.delete(`/partner-products/${id}`),
    onSuccess: invalidate,
  })

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      crmApi.put(`/partner-products/${id}`, { isActive }),
    onSuccess: invalidate,
  })

  const serviceOptions = [{ value: '', label: '全部服务' }, ...services.map((s) => ({ value: s.id, label: s.name }))]
  const partnerOptions = [{ value: '', label: '全部合作伙伴' }, ...partners.map((p) => ({ value: p.id, label: p.name }))]
  const serviceFormOptions = services.map((s) => ({ value: s.id, label: s.name }))
  const partnerFormOptions = partners.map((p) => ({ value: p.id, label: p.name }))

  return (
    <div>
      {/* 筛选栏 */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          placeholder="搜索产品名、合作伙伴..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-48"
        />
        <select
          value={filterService}
          onChange={(e) => setFilterService(e.target.value)}
          className="rounded-md border border-gray-300 px-2.5 py-2 text-sm"
        >
          {serviceOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          value={filterPartner}
          onChange={(e) => setFilterPartner(e.target.value)}
          className="rounded-md border border-gray-300 px-2.5 py-2 text-sm"
        >
          {partnerOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <span className="text-sm text-gray-400 ml-auto">共 {filtered.length} 个产品</span>
        <Button size="sm" onClick={openCreate}>新增产品</Button>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-gray-500">加载中...</div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-gray-400">暂无产品</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <div key={p.id} className={`rounded-lg border bg-white overflow-hidden ${p.isActive ? '' : 'opacity-60'}`}>
              <div className="p-3">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-gray-900 leading-snug">{p.name}</p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className="text-xs bg-blue-50 text-blue-600 rounded px-1.5 py-0.5">{p.serviceName}</span>
                      <span className="text-xs text-gray-400">{p.partnerName}</span>
                      {!p.isActive && <span className="text-xs text-gray-400">（禁用）</span>}
                    </div>
                  </div>
                  {p.price != null && (
                    <span className="text-sm font-semibold text-primary-600 flex-shrink-0">
                      {p.currency} {p.price.toLocaleString()}
                    </span>
                  )}
                </div>
                {p.description && (
                  <p className="text-xs text-gray-500 line-clamp-2">{p.description}</p>
                )}
                <div className="flex gap-2 mt-2">
                  <button onClick={() => openEdit(p)} className="text-xs text-primary-600 hover:text-primary-800">编辑</button>
                  <button onClick={() => toggleActive.mutate({ id: p.id, isActive: !p.isActive })} className="text-xs text-gray-400 hover:text-gray-600">
                    {p.isActive ? '禁用' : '启用'}
                  </button>
                  <button
                    onClick={() => { if (confirm(`确认删除「${p.name}」？`)) deleteMutation.mutate(p.id) }}
                    className="text-xs text-red-400 hover:text-red-600"
                  >
                    删除
                  </button>
                </div>
              </div>
              <div className="border-t bg-gray-50 px-3 py-2.5">
                <FileManager entityType="product" entityId={p.id} />
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <Modal
          title={editTarget ? '编辑产品' : '新增产品'}
          onClose={() => { setShowForm(false); setEditTarget(null) }}
          footer={
            <>
              <Button variant="secondary" onClick={() => { setShowForm(false); setEditTarget(null) }}>取消</Button>
              <Button loading={saveMutation.isPending} onClick={form.handleSubmit((d) => saveMutation.mutate(d))}>保存</Button>
            </>
          }
        >
          <div className="space-y-3">
            <Select label="合作伙伴" options={partnerFormOptions} error={form.formState.errors.partnerId?.message} {...form.register('partnerId')} />
            <Select label="关联服务" options={serviceFormOptions} error={form.formState.errors.serviceId?.message} {...form.register('serviceId')} />
            <Input label="产品名称" error={form.formState.errors.name?.message} {...form.register('name')} />
            <Textarea label="描述" rows={2} {...form.register('description')} />
            <div className="flex gap-2">
              <Input label="价格" type="number" className="flex-1" {...form.register('price')} />
              <div className="w-24">
                <label className="block text-sm font-medium text-gray-700 mb-1">货币</label>
                <select className="w-full rounded-md border border-gray-300 px-2.5 py-2 text-sm" {...form.register('currency')}>
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

// ─── 合作伙伴 Tab ───────────────────────────────────────────────────────────────

const partnerSchema = z.object({
  name: z.string().min(1, '请填写名称'),
  type: z.string().min(1, '请选择类型'),
  contactPerson: z.string().nullable().optional(),
  contactInfo: z.string().nullable().optional(),
  serviceScope: z.string().optional(),
})
type PartnerForm = z.infer<typeof partnerSchema>

function PartnersTab() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<Partner | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { options: partnerTypeOpts } = useOptionGroup('partner_type')

  const searchTimeout = useState<ReturnType<typeof setTimeout> | null>(null)
  const handleSearch = (val: string) => {
    setSearch(val)
    if (searchTimeout[0]) clearTimeout(searchTimeout[0])
    searchTimeout[1](setTimeout(() => { setDebouncedSearch(val); setPage(1) }, 300))
  }

  const { data, isLoading } = useQuery({
    queryKey: ['partners', debouncedSearch, page],
    queryFn: () =>
      crmApi.get<{ data: Partner[]; total: number }>('/partners', {
        params: { search: debouncedSearch || undefined, page, pageSize: PAGE_SIZE },
      }).then((r) => r.data),
  })

  const partners = data?.data ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['partners'] }); setShowForm(false) },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => crmApi.delete(`/partners/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['partners'] }),
  })

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Input
          placeholder="搜索名称、联系人..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="flex-1 max-w-xs"
        />
        <span className="text-sm text-gray-400 ml-auto">共 {total} 家</span>
        <Button size="sm" onClick={openCreate}>新建合作伙伴</Button>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-gray-500">加载中...</div>
      ) : (
        <>
          <div className="space-y-3">
            {partners.map((partner) => (
              <div key={partner.id} className="rounded-xl border overflow-hidden">
                {/* 头部 */}
                <div className="bg-white px-4 py-3 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={getOptionColor(partnerTypeOpts, partner.type)}>
                        {getOptionLabel(partnerTypeOpts, partner.type)}
                      </Badge>
                      <span className="font-semibold text-gray-900">{partner.name}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500">
                      {partner.contactPerson && <span>联系人：{partner.contactPerson}</span>}
                      {partner.contactInfo && <span>{partner.contactInfo}</span>}
                      {(partner.serviceScope ?? []).map((s) => (
                        <span key={s} className="bg-gray-100 rounded px-1.5 py-0.5">{s}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0 items-center">
                    <button
                      onClick={() => setExpandedId(expandedId === partner.id ? null : partner.id)}
                      className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded"
                    >
                      {expandedId === partner.id ? '收起资料' : '展开资料'}
                    </button>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(partner)}>编辑</Button>
                    <Button
                      variant="ghost" size="sm"
                      onClick={() => { if (confirm(`确认删除「${partner.name}」？`)) deleteMutation.mutate(partner.id) }}
                      className="text-red-500 hover:text-red-700"
                    >
                      删除
                    </Button>
                  </div>
                </div>
                {/* 资料（展开） */}
                {expandedId === partner.id && (
                  <div className="bg-gray-50 border-t px-4 py-3">
                    <FileManager entityType="partner" entityId={partner.id} />
                  </div>
                )}
              </div>
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </>
      )}

      {showForm && (
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
            <Input label="服务范围" placeholder="用逗号或顿号分隔，如：赴美试管、代孕" {...form.register('serviceScope')} />
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── 服务 Tab ──────────────────────────────────────────────────────────────────

const serviceSchema = z.object({
  name: z.string().min(1, '请填写名称'),
  description: z.string().nullable().optional(),
  price: z.coerce.number().nullable().optional(),
  processSteps: z.string().optional(),
})
type ServiceForm = z.infer<typeof serviceSchema>

function ServicesTab() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<Service | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['services'],
    queryFn: () => crmApi.get<{ data: Service[] }>('/services').then((r) => r.data),
  })
  const services = data?.data ?? []

  const form = useForm<ServiceForm>({ resolver: zodResolver(serviceSchema) })

  const openCreate = () => {
    form.reset({ name: '', description: '', price: null, processSteps: '' })
    setEditTarget(null)
    setShowForm(true)
  }

  const openEdit = (s: Service) => {
    form.reset({ name: s.name, description: s.description, price: s.price, processSteps: (s.processSteps ?? []).join('\n') })
    setEditTarget(s)
    setShowForm(true)
  }

  const saveMutation = useMutation({
    mutationFn: (body: ServiceForm) => {
      const payload = { ...body, processSteps: body.processSteps ? body.processSteps.split('\n').map((s) => s.trim()).filter(Boolean) : [] }
      return editTarget ? crmApi.put(`/services/${editTarget.id}`, payload) : crmApi.post('/services', payload)
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['services'] }); setShowForm(false) },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => crmApi.delete(`/services/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['services'] }),
  })

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-gray-400">共 {services.length} 个服务</span>
        <Button size="sm" onClick={openCreate}>新建服务</Button>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-gray-500">加载中...</div>
      ) : (
        <div className="space-y-3">
          {services.map((service) => (
            <div key={service.id} className="rounded-xl border overflow-hidden">
              {/* 头部 */}
              <div className="bg-white px-4 py-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-semibold text-gray-900">{service.name}</span>
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
                <div className="flex gap-1 flex-shrink-0 items-center">
                  <button
                    onClick={() => setExpandedId(expandedId === service.id ? null : service.id)}
                    className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded"
                  >
                    {expandedId === service.id ? '收起资料' : '展开资料'}
                  </button>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(service)}>编辑</Button>
                  <Button
                    variant="ghost" size="sm"
                    onClick={() => { if (confirm(`确认删除「${service.name}」？`)) deleteMutation.mutate(service.id) }}
                    className="text-red-500 hover:text-red-700"
                  >
                    删除
                  </Button>
                </div>
              </div>
              {/* 资料（展开） */}
              {expandedId === service.id && (
                <div className="bg-gray-50 border-t px-4 py-3">
                  <FileManager entityType="service" entityId={service.id} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <Modal
          title={editTarget ? '编辑服务' : '新建服务'}
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
            <Textarea label="描述" {...form.register('description')} />
            <Input label="价格（元）" type="number" {...form.register('price')} />
            <Textarea label="服务流程（每行一个步骤）" rows={5} placeholder={'初步咨询\n医疗评估\n方案制定'} {...form.register('processSteps')} />
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── 主页面 ────────────────────────────────────────────────────────────────────

export default function ProductLibraryPage() {
  const [activeTab, setActiveTab] = useState<Tab>('products')

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-gray-900">产品库</h1>
      </div>

      {/* Tab 导航 */}
      <div className="mb-5 border-b border-gray-200">
        <div className="flex gap-0">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                activeTab === tab.key
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'products' && <ProductsTab />}
      {activeTab === 'partners' && <PartnersTab />}
      {activeTab === 'services' && <ServicesTab />}
    </div>
  )
}
