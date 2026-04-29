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

const PAGE_SIZE = 20

interface PartnerProduct {
  id: string
  partnerId: string
  serviceId: string
  serviceName: string
  name: string
  description: string | null
  price: number | null
  currency: string
  isActive: number
}

const partnerSchema = z.object({
  name: z.string().min(1, '请填写名称'),
  type: z.string().min(1, '请选择类型'),
  contactPerson: z.string().nullable().optional(),
  contactInfo: z.string().nullable().optional(),
  serviceScope: z.string().optional(),
})
type PartnerForm = z.infer<typeof partnerSchema>

const productSchema = z.object({
  serviceId: z.string().min(1, '请选择关联服务'),
  name: z.string().min(1, '请填写产品名称'),
  description: z.string().nullable().optional(),
  price: z.coerce.number().nullable().optional(),
  currency: z.string().default('USD'),
})
type ProductForm = z.infer<typeof productSchema>

// ─── 产品卡片 ──────────────────────────────────────────────────────────────────

function ProductCard({
  product,
  onEdit,
  onDelete,
  onToggleActive,
}: {
  product: PartnerProduct
  onEdit: (p: PartnerProduct) => void
  onDelete: (p: PartnerProduct) => void
  onToggleActive: (p: PartnerProduct) => void
}) {
  return (
    <div className={`rounded-lg border bg-white ${product.isActive ? '' : 'opacity-60'}`}>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm text-gray-900">{product.name}</span>
              <span className="text-xs bg-gray-100 text-gray-500 rounded px-1.5 py-0.5">{product.serviceName}</span>
              {!product.isActive && <span className="text-xs text-gray-400">（已禁用）</span>}
            </div>
            {product.price != null && (
              <p className="text-sm font-semibold text-primary-600 mt-0.5">
                {product.currency} {product.price.toLocaleString()}
              </p>
            )}
            {product.description && (
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{product.description}</p>
            )}
          </div>
          <div className="flex gap-1.5 flex-shrink-0">
            <button onClick={() => onEdit(product)} className="text-xs text-primary-600 hover:text-primary-800">编辑</button>
            <button onClick={() => onToggleActive(product)} className="text-xs text-gray-400 hover:text-gray-600">
              {product.isActive ? '禁用' : '启用'}
            </button>
            <button onClick={() => onDelete(product)} className="text-xs text-red-400 hover:text-red-600">删除</button>
          </div>
        </div>
      </div>
      {/* 资料直接展示在产品卡片下方 */}
      <div className="border-t bg-gray-50 px-3 py-2.5 rounded-b-lg">
        <p className="text-xs font-medium text-gray-400 mb-1.5">产品资料</p>
        <FileManager entityType="product" entityId={product.id} />
      </div>
    </div>
  )
}

// ─── 合作伙伴区块 ──────────────────────────────────────────────────────────────

function PartnerSection({
  partner,
  partnerTypeOpts,
  onEdit,
  onDelete,
}: {
  partner: Partner
  partnerTypeOpts: ReturnType<typeof useOptionGroup>['options']
  onEdit: (p: Partner) => void
  onDelete: (p: Partner) => void
}) {
  const queryClient = useQueryClient()
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [editProduct, setEditProduct] = useState<PartnerProduct | null>(null)

  const { data: servicesData } = useQuery({
    queryKey: ['services'],
    queryFn: () => crmApi.get<{ data: Service[] }>('/services').then((r) => r.data),
    staleTime: 1000 * 60 * 5,
  })
  const services = servicesData?.data ?? []

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['partner-products', partner.id],
    queryFn: () =>
      crmApi.get<{ data: PartnerProduct[] }>('/partner-products', { params: { partnerId: partner.id } })
        .then((r) => r.data),
  })
  const products = productsData?.data ?? []

  const invalidateProducts = () => {
    queryClient.invalidateQueries({ queryKey: ['partner-products', partner.id] })
    queryClient.invalidateQueries({ queryKey: ['partner-products-by-service'] })
    queryClient.invalidateQueries({ queryKey: ['partner-products', 'active'] })
  }

  const productForm = useForm<ProductForm>({ resolver: zodResolver(productSchema), defaultValues: { currency: 'USD' } })

  const openAddProduct = () => {
    productForm.reset({ serviceId: services[0]?.id ?? '', name: '', description: '', price: null, currency: 'USD' })
    setEditProduct(null)
    setShowAddProduct(true)
  }

  const openEditProduct = (p: PartnerProduct) => {
    productForm.reset({ serviceId: p.serviceId, name: p.name, description: p.description, price: p.price, currency: p.currency })
    setEditProduct(p)
    setShowAddProduct(true)
  }

  const saveProduct = useMutation({
    mutationFn: (body: ProductForm) =>
      editProduct
        ? crmApi.put(`/partner-products/${editProduct.id}`, body)
        : crmApi.post('/partner-products', { ...body, partnerId: partner.id }),
    onSuccess: () => { setShowAddProduct(false); setEditProduct(null); invalidateProducts() },
  })

  const deleteProduct = useMutation({
    mutationFn: (id: string) => crmApi.delete(`/partner-products/${id}`),
    onSuccess: invalidateProducts,
  })

  const toggleProductActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      crmApi.put(`/partner-products/${id}`, { isActive }),
    onSuccess: invalidateProducts,
  })

  const serviceOptions = services.map((s) => ({ value: s.id, label: s.name }))

  return (
    <div className="rounded-xl border bg-gray-50 overflow-hidden">
      {/* 合作伙伴头部 */}
      <div className="flex items-start gap-3 bg-white px-4 py-3 border-b">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={getOptionColor(partnerTypeOpts, partner.type)}>
              {getOptionLabel(partnerTypeOpts, partner.type)}
            </Badge>
            <h2 className="font-semibold text-gray-900">{partner.name}</h2>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500">
            {partner.contactPerson && <span>联系人：{partner.contactPerson}</span>}
            {partner.contactInfo && <span>{partner.contactInfo}</span>}
            {(partner.serviceScope ?? []).map((s) => (
              <span key={s} className="bg-gray-100 rounded px-1.5 py-0.5">{s}</span>
            ))}
          </div>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <Button variant="ghost" size="sm" onClick={() => onEdit(partner)}>编辑</Button>
          <Button
            variant="ghost" size="sm"
            onClick={() => { if (confirm(`确认删除「${partner.name}」？`)) onDelete(partner) }}
            className="text-red-500 hover:text-red-700"
          >
            删除
          </Button>
        </div>
      </div>

      {/* 产品 + 伙伴文件双栏 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-gray-200">
        {/* 产品列表（占 2/3） */}
        <div className="lg:col-span-2 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700">
              产品 {products.length > 0 && <span className="text-gray-400 font-normal">({products.length})</span>}
            </span>
            <button
              onClick={openAddProduct}
              className="text-xs text-primary-600 hover:text-primary-800 font-medium"
            >
              + 添加产品
            </button>
          </div>
          {productsLoading ? (
            <p className="text-xs text-gray-400 py-4 text-center">加载中...</p>
          ) : products.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">暂无产品</p>
          ) : (
            <div className="space-y-3">
              {products.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  onEdit={openEditProduct}
                  onDelete={(p) => { if (confirm(`确认删除「${p.name}」？`)) deleteProduct.mutate(p.id) }}
                  onToggleActive={(p) => toggleProductActive.mutate({ id: p.id, isActive: !p.isActive })}
                />
              ))}
            </div>
          )}
        </div>

        {/* 伙伴文件（占 1/3） */}
        <div className="p-4">
          <p className="text-sm font-medium text-gray-700 mb-3">伙伴资料</p>
          <FileManager entityType="partner" entityId={partner.id} />
        </div>
      </div>

      {/* 产品弹窗 */}
      {showAddProduct && (
        <Modal
          title={editProduct ? '编辑产品' : '添加产品'}
          onClose={() => { setShowAddProduct(false); setEditProduct(null) }}
          footer={
            <>
              <Button variant="secondary" onClick={() => { setShowAddProduct(false); setEditProduct(null) }}>取消</Button>
              <Button loading={saveProduct.isPending} onClick={productForm.handleSubmit((d) => saveProduct.mutate(d))}>保存</Button>
            </>
          }
        >
          <div className="space-y-3">
            <Select label="关联服务" options={serviceOptions} error={productForm.formState.errors.serviceId?.message} {...productForm.register('serviceId')} />
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

export default function PartnersPage() {
  const queryClient = useQueryClient()
  const [editTarget, setEditTarget] = useState<Partner | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)

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

  const deletePartner = useMutation({
    mutationFn: (id: string) => crmApi.delete(`/partners/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['partners'] }),
  })

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">合作伙伴</h1>
          <p className="mt-0.5 text-sm text-gray-500">共 {total} 家</p>
        </div>
        <Button onClick={openCreate}>新建合作伙伴</Button>
      </div>

      <div className="mb-4">
        <Input placeholder="搜索名称、联系人..." value={search} onChange={(e) => handleSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-gray-500">加载中...</div>
      ) : (
        <>
          <div className="space-y-6">
            {partners.map((partner) => (
              <PartnerSection
                key={partner.id}
                partner={partner}
                partnerTypeOpts={partnerTypeOpts}
                onEdit={openEdit}
                onDelete={(p) => deletePartner.mutate(p.id)}
              />
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
