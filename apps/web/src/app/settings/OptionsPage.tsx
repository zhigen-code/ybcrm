import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { crmApi } from '@/shared/utils/request'
import { Button } from '@/shared/components/Button'
import { Input } from '@/shared/components/Input'
import { Modal } from '@/shared/components/Modal'
import { Badge } from '@/shared/components/Badge'
import type { OptionItem, ActivityMetaField } from '@/shared/hooks/useOptions'
import { parseActivityMeta } from '@/shared/hooks/useOptions'

const VALID_COLORS = ['gray', 'blue', 'green', 'yellow', 'red', 'purple'] as const
type Color = typeof VALID_COLORS[number]

const COLOR_CLASS: Record<Color, string> = {
  gray:   'bg-gray-200',
  blue:   'bg-blue-400',
  green:  'bg-green-400',
  yellow: 'bg-yellow-400',
  red:    'bg-red-400',
  purple: 'bg-purple-400',
}

const GROUPS = [
  { key: 'lead_status',     labelKey: 'settings.options.leadStatus',     noAdd: true },
  { key: 'contract_status', labelKey: 'settings.options.contractStatus',  noAdd: false },
  { key: 'activity_type',   labelKey: 'settings.options.activityTypes',   noAdd: false },
  { key: 'partner_type',    labelKey: 'settings.options.partnerTypes',    noAdd: false },
]

const itemSchema = z.object({
  value: z.string().min(1),
  label: z.string().min(1),
  color: z.enum(VALID_COLORS).default('gray'),
})
type ItemForm = z.infer<typeof itemSchema>

function ColorPicker({ value, onChange }: { value: Color; onChange: (c: Color) => void }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {VALID_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={`w-6 h-6 rounded-full ${COLOR_CLASS[c]} ${
            value === c ? 'ring-2 ring-offset-1 ring-primary-600' : 'opacity-70 hover:opacity-100'
          }`}
          title={c}
        />
      ))}
    </div>
  )
}

type Scope = 'lead' | 'client'

function ActivityMetaEditor({
  metadata, onChange,
}: {
  metadata: string | null | undefined
  onChange: (meta: string | null) => void
}) {
  const { t } = useTranslation()
  const parsed = parseActivityMeta({ metadata } as OptionItem)
  const scope: Scope[] = parsed.scope ?? ['lead', 'client']
  const fields: ActivityMetaField[] = parsed.fields ?? []

  const update = (newScope: Scope[], newFields: ActivityMetaField[]) => {
    const meta = { scope: newScope, fields: newFields }
    onChange(JSON.stringify(meta))
  }

  const toggleScope = (s: Scope) => {
    const next = scope.includes(s) ? scope.filter((x) => x !== s) : [...scope, s]
    update(next.length > 0 ? next : ['lead', 'client'], fields)
  }

  const addField = () => update(scope, [...fields, { key: `field_${Date.now()}`, label: '', type: 'text' }])
  const removeField = (i: number) => update(scope, fields.filter((_, idx) => idx !== i))
  const setField = (i: number, patch: Partial<ActivityMetaField>) =>
    update(scope, fields.map((f, idx) => idx === i ? { ...f, ...patch } : f))

  return (
    <div className="space-y-3 border-t pt-3">
      <div>
        <p className="text-sm font-medium text-gray-700 mb-1.5">{t('settings.options.cols.scope')}</p>
        <div className="flex gap-4">
          {([['lead', t('settings.workflow.trigger.targets.lead')], ['client', t('settings.workflow.trigger.targets.client')]] as [Scope, string][]).map(([val, label]) => (
            <label key={val} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={scope.includes(val)} onChange={() => toggleScope(val)} className="rounded" />
              {label}
            </label>
          ))}
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-sm font-medium text-gray-700">{t('settings.options.customFields')}</p>
          <button type="button" onClick={addField} className="text-xs text-primary-600 hover:text-primary-800">{t('settings.options.addField')}</button>
        </div>
        {fields.length === 0 ? (
          <p className="text-xs text-gray-400">{t('settings.options.noFields')}</p>
        ) : (
          <div className="space-y-2">
            {fields.map((f, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <input
                    placeholder={t('settings.options.fieldLabel')}
                    className="h-7 flex-1 rounded border border-gray-300 px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
                    value={f.label}
                    onChange={(e) => setField(i, { label: e.target.value, key: e.target.value.replace(/\s+/g, '_').toLowerCase() || f.key })}
                  />
                  <select
                    className="h-7 rounded border border-gray-300 px-1 text-xs focus:outline-none"
                    value={f.type}
                    onChange={(e) => setField(i, { type: e.target.value as ActivityMetaField['type'], options: [], unit: '' })}
                  >
                    <option value="text">{t('settings.options.types.text')}</option>
                    <option value="number">{t('settings.options.types.number')}</option>
                    <option value="date">{t('settings.options.types.date')}</option>
                    <option value="select">{t('settings.options.types.select')}</option>
                    <option value="product_select">{t('settings.options.types.product_select')}</option>
                  </select>
                  {f.type === 'number' && (
                    <input
                      placeholder={t('settings.options.fieldUnit')}
                      className="h-7 w-14 rounded border border-gray-300 px-2 text-xs focus:outline-none"
                      value={f.unit ?? ''}
                      onChange={(e) => { const u = e.target.value; setField(i, { unit: u }) }}
                    />
                  )}
                  <button type="button" onClick={() => removeField(i)} className="text-xs text-red-400 hover:text-red-600">×</button>
                </div>
                {f.type === 'select' && (
                  <div className="ml-2 pl-2 border-l border-gray-200">
                    <p className="text-xs text-gray-400 mb-1">{t('settings.options.fieldOptions')}</p>
                    <textarea
                      rows={3}
                      placeholder={"Option A\nOption B\nOption C"}
                      className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none"
                      value={(f.options ?? []).join('\n')}
                      onChange={(e) => setField(i, { options: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) })}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function OptionGroupPanel({ groupKey, noAdd }: { groupKey: string; noAdd: boolean }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [editTarget, setEditTarget] = useState<OptionItem | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [editColor, setEditColor] = useState<Color>('gray')
  const [addColor, setAddColor] = useState<Color>('gray')
  const [editMeta, setEditMeta] = useState<string | null>(null)
  const [addMeta, setAddMeta] = useState<string | null>(null)
  const isActivityType = groupKey === 'activity_type'

  const { data, isLoading } = useQuery({
    queryKey: ['admin-options', groupKey],
    queryFn: () =>
      crmApi.get<{ data: OptionItem[] }>('/admin/options/items', { params: { groupKey } })
        .then((r) => r.data.data),
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-options', groupKey] })
    queryClient.invalidateQueries({ queryKey: ['options'] })
  }

  const editForm = useForm<ItemForm>({ resolver: zodResolver(itemSchema) })
  const addForm = useForm<ItemForm>({ resolver: zodResolver(itemSchema), defaultValues: { color: 'gray' } })

  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }: { id: string } & ItemForm) =>
      crmApi.put(`/admin/options/items/${id}`, { ...body, metadata: isActivityType ? editMeta : undefined }),
    onSuccess: () => { setEditTarget(null); invalidate() },
  })

  const addMutation = useMutation({
    mutationFn: (body: ItemForm) =>
      crmApi.post('/admin/options/items', { ...body, groupKey, metadata: isActivityType ? addMeta : undefined }),
    onSuccess: () => { setShowAdd(false); addForm.reset(); setAddColor('gray'); setAddMeta(null); invalidate() },
  })

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      crmApi.put(`/admin/options/items/${id}`, { isActive }),
    onSuccess: invalidate,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => crmApi.delete(`/admin/options/items/${id}`),
    onSuccess: invalidate,
  })

  const openEdit = (item: OptionItem) => {
    setEditTarget(item)
    setEditColor(item.color)
    setEditMeta(item.metadata ?? null)
    editForm.reset({ value: item.value, label: item.label, color: item.color })
  }

  if (isLoading) return <div className="py-8 text-center text-sm text-gray-400">{t('common.loading')}</div>

  return (
    <div>
      <div className="rounded-lg border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-700 w-8">{t('settings.options.cols.color')}</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">{t('settings.options.cols.value')}</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">{t('settings.options.cols.label')}</th>
              {isActivityType && <th className="px-4 py-3 text-left font-medium text-gray-700">{t('settings.options.cols.scope')}</th>}
              <th className="px-4 py-3 text-left font-medium text-gray-700">{t('settings.options.cols.status')}</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data?.map((item) => {
              const itemMeta = isActivityType ? parseActivityMeta(item) : null
              const itemScope: ('lead' | 'client')[] = itemMeta?.scope ?? ['lead', 'client']
              const toggleItemScope = (s: 'lead' | 'client') => {
                const next = itemScope.includes(s) ? itemScope.filter(x => x !== s) : [...itemScope, s]
                const newScope = next.length > 0 ? next : ['lead', 'client']
                const newMeta = { ...itemMeta, scope: newScope }
                crmApi.put(`/admin/options/items/${item.id}`, { metadata: JSON.stringify(newMeta) })
                  .then(invalidate)
              }
              return (
              <tr key={item.id} className={item.isActive ? '' : 'opacity-50'}>
                <td className="px-4 py-3">
                  <span className={`inline-block w-4 h-4 rounded-full ${COLOR_CLASS[item.color] ?? 'bg-gray-200'}`} />
                </td>
                <td className="px-4 py-3 text-gray-500 font-mono text-xs">{item.value}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{item.label}</td>
                {isActivityType && (
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {(['lead', 'client'] as const).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => toggleItemScope(s)}
                          className={`rounded px-2 py-0.5 text-xs font-medium border transition-colors ${
                            itemScope.includes(s)
                              ? 'bg-primary-50 border-primary-300 text-primary-700'
                              : 'bg-gray-50 border-gray-200 text-gray-400'
                          }`}
                        >
                          {s === 'lead' ? t('settings.workflow.trigger.targets.lead') : t('settings.workflow.trigger.targets.client')}
                        </button>
                      ))}
                    </div>
                  </td>
                )}
                <td className="px-4 py-3">
                  <Badge variant={item.isActive ? 'green' : 'gray'}>
                    {item.isActive ? t('common.enabled') : t('common.disabled')}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 justify-end">
                    <button
                      onClick={() => openEdit(item)}
                      className="text-xs text-primary-600 hover:text-primary-800"
                    >
                      {t('common.edit')}
                    </button>
                    {!item.isSystem && (
                      <>
                        <span className="text-gray-300">|</span>
                        <button
                          onClick={() => toggleActive.mutate({ id: item.id, isActive: !item.isActive })}
                          className="text-xs text-gray-500 hover:text-gray-700"
                        >
                          {item.isActive ? t('common.disable') : t('common.enable')}
                        </button>
                        <span className="text-gray-300">|</span>
                        <button
                          onClick={() => {
                            if (confirm(t('settings.options.deleteConfirm', { name: item.label }))) deleteMutation.mutate(item.id)
                          }}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          {t('common.delete')}
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>

      {!noAdd && (
        <div className="mt-3">
          <Button variant="secondary" size="sm" onClick={() => setShowAdd(true)}>
            {t('settings.options.addOption')}
          </Button>
        </div>
      )}

      {/* 编辑弹窗 */}
      {editTarget && (
        <Modal
          title={t('settings.options.editOption', { name: editTarget.label })}
          onClose={() => setEditTarget(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setEditTarget(null)}>{t('common.cancel')}</Button>
              <Button
                loading={updateMutation.isPending}
                onClick={editForm.handleSubmit((d) =>
                  updateMutation.mutate({ id: editTarget.id, ...d, color: editColor })
                )}
              >
                {t('common.save')}
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            {editTarget.isSystem ? (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">{t('settings.options.valueFixed')}</p>
                <p className="rounded-md bg-gray-100 px-3 py-2 text-sm text-gray-500 font-mono">{editTarget.value}</p>
              </div>
            ) : (
              <Input label={t('settings.options.valueLabel')} error={editForm.formState.errors.value?.message} {...editForm.register('value')} />
            )}
            <Input label={t('settings.options.labelLabel')} error={editForm.formState.errors.label?.message} {...editForm.register('label')} />
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">{t('settings.options.colorLabel')}</p>
              <ColorPicker value={editColor} onChange={setEditColor} />
            </div>
            {isActivityType && <ActivityMetaEditor metadata={editMeta} onChange={setEditMeta} />}
          </div>
        </Modal>
      )}

      {/* 添加弹窗 */}
      {showAdd && (
        <Modal
          title={t('settings.options.addOptionTitle')}
          onClose={() => { setShowAdd(false); addForm.reset(); setAddColor('gray') }}
          footer={
            <>
              <Button variant="secondary" onClick={() => { setShowAdd(false); addForm.reset(); setAddColor('gray') }}>{t('common.cancel')}</Button>
              <Button
                loading={addMutation.isPending}
                onClick={addForm.handleSubmit((d) => addMutation.mutate({ ...d, color: addColor }))}
              >
                {t('common.add')}
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            <Input label={t('settings.options.optionValue')} placeholder={t('settings.options.optionValuePlaceholder')} error={addForm.formState.errors.value?.message} {...addForm.register('value')} />
            <Input label={t('settings.options.optionLabel')} placeholder={t('settings.options.optionLabelPlaceholder')} error={addForm.formState.errors.label?.message} {...addForm.register('label')} />
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">{t('settings.options.optionColor')}</p>
              <ColorPicker value={addColor} onChange={setAddColor} />
            </div>
            {isActivityType && <ActivityMetaEditor metadata={addMeta} onChange={setAddMeta} />}
          </div>
        </Modal>
      )}
    </div>
  )
}

export default function OptionsPage() {
  const { t } = useTranslation()
  const [activeGroup, setActiveGroup] = useState(GROUPS[0]!.key)
  const current = GROUPS.find((g) => g.key === activeGroup) ?? GROUPS[0]!

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-lg sm:text-xl font-semibold text-gray-900">{t('settings.options.title')}</h1>
        <p className="mt-0.5 text-sm text-gray-500">{t('settings.options.subtitle')}</p>
      </div>

      {/* Tab 切换 */}
      <div className="mb-4 flex gap-1 border-b">
        {GROUPS.map((g) => (
          <button
            key={g.key}
            onClick={() => setActiveGroup(g.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeGroup === g.key
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t(g.labelKey)}
          </button>
        ))}
      </div>

      <OptionGroupPanel key={activeGroup} groupKey={activeGroup} noAdd={current.noAdd} />
    </div>
  )
}
