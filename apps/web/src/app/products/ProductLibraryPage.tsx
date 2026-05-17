import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
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
import { Pagination } from '@/shared/components/Pagination'
import { FileManager } from '@/shared/components/FileManager'
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

// ─── Schemas ───────────────────────────────────────────────────────────────────

const serviceSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  price: z.coerce.number().nullable().optional(),
  processSteps: z.string().optional(),
})
type ServiceForm = z.infer<typeof serviceSchema>

const partnerSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  contactPerson: z.string().nullable().optional(),
  contactInfo: z.string().nullable().optional(),
  serviceScope: z.string().optional(),
})
type PartnerForm = z.infer<typeof partnerSchema>

const productSchema = z.object({
  serviceId: z.string().min(1),
  partnerId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  price: z.coerce.number().nullable().optional(),
  currency: z.string().default('USD'),
})
type ProductForm = z.infer<typeof productSchema>

// ─── Category (Service) Manager ────────────────────────────────────────────────

function CategoryManagerModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [editTarget, setEditTarget] = useState<Service | null>(null)
  const [showForm, setShowForm] = useState(false)

  const { data } = useQuery({
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

  if (showForm) {
    return (
      <Modal
        title={editTarget ? t('common.edit') : t('services.new')}
        onClose={() => setShowForm(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowForm(false)}>{t('common.cancel')}</Button>
            <Button loading={saveMutation.isPending} onClick={form.handleSubmit((d) => saveMutation.mutate(d))}>{t('common.save')}</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input label={t('services.form.name')} error={form.formState.errors.name?.message} {...form.register('name')} />
          <Textarea label={t('services.form.description')} {...form.register('description')} />
          <Input label={t('services.form.price')} type="number" {...form.register('price')} />
          <Textarea label={t('products.serviceForm.steps')} rows={4} placeholder={t('products.serviceForm.stepsPlaceholder')} {...form.register('processSteps')} />
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      title={t('products.categories')}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('common.close')}</Button>
          <Button onClick={openCreate}>{t('services.new')}</Button>
        </>
      }
    >
      <div className="space-y-2">
        {services.map((s) => (
          <div key={s.id} className="flex items-center gap-2 rounded-lg border px-3 py-2">
            <span className="flex-1 text-sm font-medium text-gray-900">{s.name}</span>
            {s.price != null && <span className="text-sm text-primary-600">¥{s.price.toLocaleString()}</span>}
            <button onClick={() => openEdit(s)} className="text-xs text-primary-600 hover:text-primary-800">{t('common.edit')}</button>
            <button
              onClick={() => { if (confirm(t('services.deleteConfirm', { name: s.name }))) deleteMutation.mutate(s.id) }}
              className="text-xs text-red-400 hover:text-red-600"
            >
              {t('common.delete')}
            </button>
          </div>
        ))}
        {services.length === 0 && <p className="py-6 text-center text-sm text-gray-400">{t('products.noServices')}</p>}
      </div>
    </Modal>
  )
}

// ─── Supplier (Partner) Manager ────────────────────────────────────────────────

const PARTNER_PAGE_SIZE = 50

function SupplierManagerModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
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
    form.reset({ name: p.name, type: p.type, contactPerson: p.contactPerson, contactInfo: p.contactInfo, serviceScope: (p.serviceScope ?? []).join(t('common.sep')) })
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
        title={editTarget ? t('common.edit') : t('products.newSupplier')}
        onClose={() => setShowForm(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowForm(false)}>{t('common.cancel')}</Button>
            <Button loading={saveMutation.isPending} onClick={form.handleSubmit((d) => saveMutation.mutate(d))}>{t('common.save')}</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input label={t('partners.form.name')} error={form.formState.errors.name?.message} {...form.register('name')} />
          <Select label={t('partners.form.type')} options={toSelectOptions(partnerTypeOpts)} {...form.register('type')} />
          <Input label={t('partners.form.contact')} {...form.register('contactPerson')} />
          <Input label={t('partners.form.contactInfo')} placeholder={t('partners.form.contactInfoHint')} {...form.register('contactInfo')} />
          <Input label={t('partners.form.services')} placeholder={t('partners.form.servicesHint')} {...form.register('serviceScope')} />
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      title={t('products.suppliers')}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('common.close')}</Button>
          <Button onClick={openCreate}>{t('products.newSupplier')}</Button>
        </>
      }
    >
      {isLoading ? (
        <div className="py-8 text-center text-sm text-gray-400">{t('common.loading')}</div>
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
              <button onClick={() => openEdit(p)} className="text-xs text-primary-600 hover:text-primary-800">{t('common.edit')}</button>
              <button
                onClick={() => { if (confirm(t('partners.deleteConfirm', { name: p.name }))) deleteMutation.mutate(p.id) }}
                className="text-xs text-red-400 hover:text-red-600"
              >
                {t('common.delete')}
              </button>
            </div>
          ))}
          {partners.length === 0 && <p className="py-6 text-center text-sm text-gray-400">{t('partners.empty')}</p>}
        </div>
      )}
      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} total={total} pageSize={PARTNER_PAGE_SIZE} onPageChange={setPage} />
      )}
    </Modal>
  )
}

// ─── Row Actions Menu ──────────────────────────────────────────────────────────

function RowActions({ onEdit, onToggle, onDelete, isActive }: {
  onEdit: () => void
  onToggle: () => void
  onDelete: () => void
  isActive: boolean
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 text-base leading-none"
      >
        •••
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-10 w-28 rounded-lg border bg-white shadow-lg overflow-hidden">
          <button
            onClick={() => { onEdit(); setOpen(false) }}
            className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
          >
            {t('common.edit')}
          </button>
          <button
            onClick={() => { onToggle(); setOpen(false) }}
            className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
          >
            {isActive ? t('common.disable') : t('common.enable')}
          </button>
          <div className="border-t" />
          <button
            onClick={() => { onDelete(); setOpen(false) }}
            className="w-full px-3 py-2 text-left text-sm text-red-500 hover:bg-red-50"
          >
            {t('common.delete')}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Product Detail Drawer ────────────────────────────────────────────────────

function ProductDetailDrawer({
  product,
  services,
  partners,
  onClose,
  onEdit,
  onToggle,
  onDelete,
}: {
  product: PartnerProduct
  services: Service[]
  partners: Partner[]
  onClose: () => void
  onEdit: () => void
  onToggle: () => void
  onDelete: () => void
}) {
  const { t } = useTranslation()
  const service = services.find((s) => s.id === product.serviceId)
  const partner = partners.find((p) => p.id === product.partnerId)

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/30" onClick={onClose} />
      {/* Desktop: right panel / Mobile: bottom sheet */}
      <div className="fixed z-40 bg-white shadow-xl flex flex-col
        inset-x-0 bottom-0 top-[56px] rounded-t-2xl
        sm:inset-x-auto sm:top-0 sm:right-0 sm:bottom-0 sm:w-96 sm:rounded-none">

        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b flex-shrink-0">
          <h2 className="text-base font-semibold text-gray-900 truncate pr-4">{product.name}</h2>
          <button onClick={onClose} className="flex-shrink-0 p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Status + Price */}
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
              product.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'
            }`}>
              {product.isActive ? t('common.enabled') : t('common.disabled')}
            </span>
            {product.price != null && (
              <span className="text-lg font-semibold text-primary-600">
                {product.currency} {product.price.toLocaleString()}
              </span>
            )}
          </div>

          {/* Meta */}
          <div className="rounded-lg border divide-y text-sm">
            <div className="flex items-center px-3 py-2.5 gap-3">
              <span className="w-20 flex-shrink-0 text-xs text-gray-400">{t('products.category')}</span>
              <span className="text-gray-800">{service?.name ?? '-'}</span>
            </div>
            <div className="flex items-center px-3 py-2.5 gap-3">
              <span className="w-20 flex-shrink-0 text-xs text-gray-400">{t('products.supplier')}</span>
              <span className="text-gray-800">{partner?.name ?? product.partnerName}</span>
            </div>
            {partner?.contactPerson && (
              <div className="flex items-center px-3 py-2.5 gap-3">
                <span className="w-20 flex-shrink-0 text-xs text-gray-400">{t('partners.form.contact')}</span>
                <span className="text-gray-800">{partner.contactPerson}</span>
              </div>
            )}
            {partner?.contactInfo && (
              <div className="flex items-start px-3 py-2.5 gap-3">
                <span className="w-20 flex-shrink-0 text-xs text-gray-400 pt-0.5">{t('partners.form.contactInfo')}</span>
                <span className="text-gray-800 break-all">{partner.contactInfo}</span>
              </div>
            )}
          </div>

          {/* Description */}
          {product.description && (
            <div>
              <p className="text-xs text-gray-400 mb-1.5">{t('partners.product.description')}</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{product.description}</p>
            </div>
          )}

          {/* Service process steps */}
          {(service?.processSteps ?? []).length > 0 && (
            <div>
              <p className="text-xs text-gray-400 mb-2">{t('products.serviceForm.steps')}</p>
              <ol className="space-y-2">
                {(service!.processSteps ?? []).map((step, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm text-gray-700">
                    <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 text-xs font-medium flex items-center justify-center flex-shrink-0">{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Attachments */}
          <div>
            <p className="text-xs text-gray-400 mb-2">{t('products.attachments')}</p>
            <FileManager entityType="product" entityId={product.id} />
          </div>
        </div>

        {/* Footer actions */}
        <div className="border-t px-5 py-3 flex items-center gap-2 flex-shrink-0">
          <Button size="sm" onClick={onEdit}>{t('common.edit')}</Button>
          <Button size="sm" variant="secondary" onClick={onToggle}>
            {product.isActive ? t('common.disable') : t('common.enable')}
          </Button>
          <button
            onClick={onDelete}
            className="ml-auto text-sm text-red-400 hover:text-red-600 transition-colors"
          >
            {t('common.delete')}
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Product Form Modal ────────────────────────────────────────────────────────

function ProductFormModal({
  product,
  services,
  partners,
  onClose,
}: {
  product: PartnerProduct | null
  services: Service[]
  partners: Partner[]
  onClose: () => void
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const form = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: product
      ? { serviceId: product.serviceId, partnerId: product.partnerId, name: product.name, description: product.description, price: product.price, currency: product.currency }
      : { serviceId: services[0]?.id ?? '', partnerId: partners[0]?.id ?? '', currency: 'USD' },
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['partner-products-all'] })
    queryClient.invalidateQueries({ queryKey: ['partner-products', 'active'] })
    queryClient.invalidateQueries({ queryKey: ['partner-products-by-service'] })
  }

  const saveMutation = useMutation({
    mutationFn: (body: ProductForm) =>
      product
        ? crmApi.put(`/partner-products/${product.id}`, body)
        : crmApi.post('/partner-products', body),
    onSuccess: () => { invalidate(); onClose() },
  })

  const serviceOptions = services.map((s) => ({ value: s.id, label: s.name }))
  const partnerOptions = partners.map((p) => ({ value: p.id, label: p.name }))

  return (
    <Modal
      title={product ? t('partners.product.edit') : t('partners.product.add')}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button loading={saveMutation.isPending} onClick={form.handleSubmit((d) => saveMutation.mutate(d))}>{t('common.save')}</Button>
        </>
      }
    >
      <div className="space-y-3">
        <Select label={t('products.category')} options={serviceOptions} error={form.formState.errors.serviceId?.message} {...form.register('serviceId')} />
        <Select label={t('products.supplier')} options={partnerOptions} error={form.formState.errors.partnerId?.message} {...form.register('partnerId')} />
        <Input label={t('partners.product.name')} error={form.formState.errors.name?.message} {...form.register('name')} />
        <Textarea label={t('partners.product.description')} rows={2} {...form.register('description')} />
        <div className="flex gap-2">
          <Input label={t('partners.product.price')} type="number" className="flex-1" {...form.register('price')} />
          <div className="w-24">
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('partners.product.currency')}</label>
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
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function ProductLibraryPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [supplierFilter, setSupplierFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const filterPanelRef = useRef<HTMLDivElement>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showCategoryManager, setShowCategoryManager] = useState(false)
  const [showSupplierManager, setShowSupplierManager] = useState(false)
  const [editProduct, setEditProduct] = useState<PartnerProduct | null | 'new'>(null)
  const [selectedProduct, setSelectedProduct] = useState<PartnerProduct | null>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterPanelRef.current && !filterPanelRef.current.contains(e.target as Node)) setShowFilterPanel(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSearch = useCallback((val: string) => {
    setSearch(val)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => setDebouncedSearch(val), 300)
  }, [])

  const hasActiveFilter = !!(categoryFilter || supplierFilter || statusFilter)

  const resetFilters = () => {
    setCategoryFilter('')
    setSupplierFilter('')
    setStatusFilter('')
  }

  const { data: servicesData } = useQuery({
    queryKey: ['services'],
    queryFn: () => crmApi.get<{ data: Service[] }>('/services').then((r) => r.data),
  })
  const services = servicesData?.data ?? []

  const { data: productsData, isLoading } = useQuery({
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

  const filtered = allProducts.filter((p) => {
    if (categoryFilter && p.serviceId !== categoryFilter) return false
    if (supplierFilter && p.partnerId !== supplierFilter) return false
    if (statusFilter === 'active' && !p.isActive) return false
    if (statusFilter === 'inactive' && p.isActive) return false
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase()
      if (!p.name.toLowerCase().includes(q) && !(p.description ?? '').toLowerCase().includes(q)) return false
    }
    return true
  })

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      crmApi.put(`/partner-products/${id}`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-products-all'] })
      queryClient.invalidateQueries({ queryKey: ['partner-products', 'active'] })
    },
  })

  const deleteProduct = useMutation({
    mutationFn: (id: string) => crmApi.delete(`/partner-products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-products-all'] })
      queryClient.invalidateQueries({ queryKey: ['partner-products', 'active'] })
    },
  })

  const serviceMap = Object.fromEntries(services.map((s) => [s.id, s.name]))

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-xl font-semibold text-gray-900">{t('products.title')}</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCategoryManager(true)}
            className="text-sm text-gray-500 hover:text-gray-700 px-2.5 py-1.5 rounded-md hover:bg-gray-100 transition-colors"
          >
            {t('products.categories')}
          </button>
          <button
            onClick={() => setShowSupplierManager(true)}
            className="text-sm text-gray-500 hover:text-gray-700 px-2.5 py-1.5 rounded-md hover:bg-gray-100 transition-colors"
          >
            {t('products.suppliers')}
          </button>
          <Button onClick={() => setEditProduct('new')}>{t('partners.product.add')}</Button>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="mb-4 relative" ref={filterPanelRef}>
        <div className="flex items-center rounded-md border border-gray-300 bg-white shadow-sm transition-colors focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500">
          <input
            className="flex-1 px-3 py-2 text-sm bg-transparent outline-none placeholder:text-gray-400"
            placeholder={t('products.search')}
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
          <button
            onClick={() => setShowFilterPanel((v) => !v)}
            className="relative flex items-center gap-1 px-3 py-2 border-l border-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
          >
            {hasActiveFilter && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary-500" />
            )}
            <span className="text-xs">{t('leads.filterBtn')}</span>
            <svg className={`w-3.5 h-3.5 transition-transform ${showFilterPanel ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {showFilterPanel && (
          <div className="absolute z-20 top-full left-0 right-0 mt-1 rounded-md border border-gray-200 bg-white shadow-lg p-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">{t('products.category')}</label>
                <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary-500">
                  <option value="">{t('products.allCategories')}</option>
                  {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              {allPartners.length > 0 && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-500">{t('products.supplier')}</label>
                  <select value={supplierFilter} onChange={(e) => setSupplierFilter(e.target.value)} className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary-500">
                    <option value="">{t('products.allSuppliers')}</option>
                    {allPartners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">{t('common.status')}</label>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary-500">
                  <option value="">{t('common.all')}</option>
                  <option value="active">{t('common.enabled')}</option>
                  <option value="inactive">{t('common.disabled')}</option>
                </select>
              </div>
            </div>
            {hasActiveFilter && (
              <div className="mt-2 pt-2 border-t border-gray-100 flex justify-end">
                <button onClick={resetFilters} className="text-xs text-gray-400 hover:text-gray-600">
                  {t('leads.resetFilter')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-white overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center text-sm text-gray-400">{t('common.loading')}</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">{t('products.noProducts')}</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3">{t('partners.product.name')}</th>
                <th className="px-4 py-3 hidden sm:table-cell">{t('products.category')}</th>
                <th className="px-4 py-3 hidden md:table-cell">{t('products.supplier')}</th>
                <th className="px-4 py-3 hidden sm:table-cell">{t('partners.product.price')}</th>
                <th className="px-4 py-3">{t('common.status')}</th>
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => setSelectedProduct(p)}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{p.name}</div>
                    {p.description && (
                      <div className="text-xs text-gray-400 mt-0.5 line-clamp-1">{p.description}</div>
                    )}
                    <div className="sm:hidden text-xs text-gray-400 mt-0.5">
                      {serviceMap[p.serviceId] ?? ''} · {p.partnerName}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-gray-600">
                    {serviceMap[p.serviceId] ?? '-'}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-gray-600">
                    {p.partnerName}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-gray-700">
                    {p.price != null ? `${p.currency} ${p.price.toLocaleString()}` : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      p.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {p.isActive ? t('common.enabled') : t('common.disabled')}
                    </span>
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <RowActions
                      isActive={!!p.isActive}
                      onEdit={() => setEditProduct(p)}
                      onToggle={() => toggleActive.mutate({ id: p.id, isActive: !p.isActive })}
                      onDelete={() => {
                        if (confirm(t('partners.deleteConfirm', { name: p.name }))) deleteProduct.mutate(p.id)
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedProduct && !editProduct && (
        <ProductDetailDrawer
          product={allProducts.find((p) => p.id === selectedProduct.id) ?? selectedProduct}
          services={services}
          partners={allPartners}
          onClose={() => setSelectedProduct(null)}
          onEdit={() => { setEditProduct(selectedProduct); setSelectedProduct(null) }}
          onToggle={() => toggleActive.mutate({ id: selectedProduct.id, isActive: !selectedProduct.isActive })}
          onDelete={() => {
            if (confirm(t('partners.deleteConfirm', { name: selectedProduct.name }))) {
              deleteProduct.mutate(selectedProduct.id)
              setSelectedProduct(null)
            }
          }}
        />
      )}
      {showCategoryManager && <CategoryManagerModal onClose={() => setShowCategoryManager(false)} />}
      {showSupplierManager && <SupplierManagerModal onClose={() => setShowSupplierManager(false)} />}
      {editProduct != null && (
        <ProductFormModal
          product={editProduct === 'new' ? null : editProduct}
          services={services}
          partners={allPartners}
          onClose={() => setEditProduct(null)}
        />
      )}
    </div>
  )
}
