import { useState } from 'react'
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
  { key: 'lead_status',     label: '线索状态',     noAdd: true },
  { key: 'contract_status', label: '合同状态',     noAdd: false },
  { key: 'activity_type',   label: '跟进类型',     noAdd: false },
  { key: 'partner_type',    label: '合作伙伴类型', noAdd: false },
]

const itemSchema = z.object({
  value: z.string().min(1, '请填写值'),
  label: z.string().min(1, '请填写标签'),
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
        <p className="text-sm font-medium text-gray-700 mb-1.5">适用范围</p>
        <div className="flex gap-4">
          {([['lead', '线索'], ['client', '客户']] as [Scope, string][]).map(([val, label]) => (
            <label key={val} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={scope.includes(val)} onChange={() => toggleScope(val)} className="rounded" />
              {label}
            </label>
          ))}
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-sm font-medium text-gray-700">自定义字段</p>
          <button type="button" onClick={addField} className="text-xs text-primary-600 hover:text-primary-800">+ 添加字段</button>
        </div>
        {fields.length === 0 ? (
          <p className="text-xs text-gray-400">无自定义字段</p>
        ) : (
          <div className="space-y-2">
            {fields.map((f, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  placeholder="字段名"
                  className="h-7 flex-1 rounded border border-gray-300 px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
                  value={f.label}
                  onChange={(e) => setField(i, { label: e.target.value, key: e.target.value.replace(/\s+/g, '_').toLowerCase() || f.key })}
                />
                <select
                  className="h-7 rounded border border-gray-300 px-1 text-xs focus:outline-none"
                  value={f.type}
                  onChange={(e) => setField(i, { type: e.target.value as 'text' | 'number' })}
                >
                  <option value="text">文本</option>
                  <option value="number">数字</option>
                </select>
                {f.type === 'number' && (
                  <input
                    placeholder="单位"
                    className="h-7 w-14 rounded border border-gray-300 px-2 text-xs focus:outline-none"
                    value={f.unit ?? ''}
                    onChange={(e) => { const u = e.target.value; setField(i, u ? { unit: u } : { unit: '' }) }}
                  />
                )}
                <button type="button" onClick={() => removeField(i)} className="text-xs text-red-400 hover:text-red-600">×</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function OptionGroupPanel({ groupKey, noAdd }: { groupKey: string; noAdd: boolean }) {
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

  if (isLoading) return <div className="py-8 text-center text-sm text-gray-400">加载中...</div>

  return (
    <div>
      <div className="rounded-lg border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-700 w-8">色</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">值</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">标签</th>
              {isActivityType && <th className="px-4 py-3 text-left font-medium text-gray-700">适用范围</th>}
              <th className="px-4 py-3 text-left font-medium text-gray-700">状态</th>
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
                          {s === 'lead' ? '线索' : '客户'}
                        </button>
                      ))}
                    </div>
                  </td>
                )}
                <td className="px-4 py-3">
                  <Badge variant={item.isActive ? 'green' : 'gray'}>
                    {item.isActive ? '启用' : '禁用'}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 justify-end">
                    <button
                      onClick={() => openEdit(item)}
                      className="text-xs text-primary-600 hover:text-primary-800"
                    >
                      编辑
                    </button>
                    {!item.isSystem && (
                      <>
                        <span className="text-gray-300">|</span>
                        <button
                          onClick={() => toggleActive.mutate({ id: item.id, isActive: !item.isActive })}
                          className="text-xs text-gray-500 hover:text-gray-700"
                        >
                          {item.isActive ? '禁用' : '启用'}
                        </button>
                        <span className="text-gray-300">|</span>
                        <button
                          onClick={() => {
                            if (confirm(`确认删除「${item.label}」？`)) deleteMutation.mutate(item.id)
                          }}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          删除
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
            + 添加选项
          </Button>
        </div>
      )}

      {/* 编辑弹窗 */}
      {editTarget && (
        <Modal
          title={`编辑：${editTarget.label}`}
          onClose={() => setEditTarget(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setEditTarget(null)}>取消</Button>
              <Button
                loading={updateMutation.isPending}
                onClick={editForm.handleSubmit((d) =>
                  updateMutation.mutate({ id: editTarget.id, ...d, color: editColor })
                )}
              >
                保存
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            {editTarget.isSystem ? (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">值（系统固定，不可修改）</p>
                <p className="rounded-md bg-gray-100 px-3 py-2 text-sm text-gray-500 font-mono">{editTarget.value}</p>
              </div>
            ) : (
              <Input label="值" error={editForm.formState.errors.value?.message} {...editForm.register('value')} />
            )}
            <Input label="标签" error={editForm.formState.errors.label?.message} {...editForm.register('label')} />
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">颜色</p>
              <ColorPicker value={editColor} onChange={setEditColor} />
            </div>
            {isActivityType && <ActivityMetaEditor metadata={editMeta} onChange={setEditMeta} />}
          </div>
        </Modal>
      )}

      {/* 添加弹窗 */}
      {showAdd && (
        <Modal
          title="添加选项"
          onClose={() => { setShowAdd(false); addForm.reset(); setAddColor('gray') }}
          footer={
            <>
              <Button variant="secondary" onClick={() => { setShowAdd(false); addForm.reset(); setAddColor('gray') }}>取消</Button>
              <Button
                loading={addMutation.isPending}
                onClick={addForm.handleSubmit((d) => addMutation.mutate({ ...d, color: addColor }))}
              >
                添加
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            <Input label="值（唯一标识）" placeholder="如 InProgress" error={addForm.formState.errors.value?.message} {...addForm.register('value')} />
            <Input label="标签（显示文本）" placeholder="如 进行中" error={addForm.formState.errors.label?.message} {...addForm.register('label')} />
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">颜色</p>
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
  const [activeGroup, setActiveGroup] = useState(GROUPS[0]!.key)
  const current = GROUPS.find((g) => g.key === activeGroup) ?? GROUPS[0]!

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-lg sm:text-xl font-semibold text-gray-900">选项配置</h1>
        <p className="mt-0.5 text-sm text-gray-500">管理各业务模块的下拉选项、状态标签和颜色</p>
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
            {g.label}
          </button>
        ))}
      </div>

      <OptionGroupPanel key={activeGroup} groupKey={activeGroup} noAdd={current.noAdd} />
    </div>
  )
}
