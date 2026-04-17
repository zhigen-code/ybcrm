import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useEffect, useState } from 'react'
import { crmApi } from '@/shared/utils/request'
import { Input } from '@/shared/components/Input'
import { Button } from '@/shared/components/Button'
import { Select } from '@/shared/components/Select'
import { Modal } from '@/shared/components/Modal'
import { Badge } from '@/shared/components/Badge'
import type { Team } from '@/shared/types'
import type { OptionItem } from '@/shared/hooks/useOptions'
import type { FieldPolicy } from '@/shared/hooks/useFieldPolicies'

// ─── 选项配置相关常量和组件 ───────────────────────────────────────────────────

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

const OPTION_GROUPS = [
  { key: 'lead_status',     label: '线索状态',     noAdd: true },
  { key: 'contract_status', label: '合同状态',     noAdd: false },
  { key: 'activity_type',   label: '跟进类型',     noAdd: false },
  { key: 'partner_type',    label: '合作伙伴类型', noAdd: false },
]

const optionItemSchema = z.object({
  value: z.string().min(1, '请填写值'),
  label: z.string().min(1, '请填写标签'),
  color: z.enum(VALID_COLORS).default('gray'),
})
type OptionItemForm = z.infer<typeof optionItemSchema>

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

// ─── 字段策略管理面板 ─────────────────────────────────────────────────────────

const ENTITY_LABELS: Record<string, string> = { lead: '线索', client: '客户' }
const FIELD_LABELS: Record<string, string> = { status: '状态', contractStatus: '合同状态' }

const STATUS_VALUE_LABELS: Record<string, string> = {
  New: '新线索', Contacted: '已联系', Qualified: '已确认', Converted: '已转化', Lost: '已丢失',
}

function FieldPoliciesPanel() {
  const queryClient = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({
    entityType: 'lead',
    triggerField: 'status',
    triggerValue: '',
    requireActivity: true,
    activityContentRequired: false,
    contentPresets: '',
    requiredFields: '',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['admin-field-policies'],
    queryFn: () =>
      crmApi.get<{ data: FieldPolicy[] }>('/admin/field-policies').then((r) => r.data.data),
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-field-policies'] })
    queryClient.invalidateQueries({ queryKey: ['field-policies'] })
  }

  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      crmApi.put(`/admin/field-policies/${id}`, { isActive }),
    onSuccess: invalidate,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => crmApi.delete(`/admin/field-policies/${id}`),
    onSuccess: invalidate,
  })

  const addMutation = useMutation({
    mutationFn: () => {
      const presets = addForm.contentPresets
        ? addForm.contentPresets.split(/[,，、]/).map((s) => s.trim()).filter(Boolean)
        : []
      const policyConfig = {
        requireActivity: addForm.requireActivity,
        activityContentRequired: addForm.activityContentRequired,
        ...(presets.length ? { contentPresets: presets } : {}),
      }
      return crmApi.post('/admin/field-policies', {
        entityType: addForm.entityType,
        triggerField: addForm.triggerField,
        triggerValue: addForm.triggerValue,
        policyConfig,
      })
    },
    onSuccess: () => {
      invalidate()
      setShowAdd(false)
      setAddForm({ entityType: 'lead', triggerField: 'status', triggerValue: '', requireActivity: true, activityContentRequired: false, contentPresets: '', requiredFields: '' })
    },
  })

  if (isLoading) return <div className="py-8 text-center text-sm text-gray-400">加载中...</div>

  const formatPolicyConfig = (p: FieldPolicy) => {
    const cfg = p.policyConfig
    const parts: string[] = []
    if (cfg.requireActivity) parts.push('要求跟进记录')
    if (cfg.activityContentRequired) parts.push('内容必填')
    if (cfg.contentPresets?.length) parts.push(`快选：${cfg.contentPresets.join(' / ')}`)
    if (cfg.requiredFields?.length) parts.push(`必填：${cfg.requiredFields.map((f) => f.label).join('、')}`)
    return parts.join('；') || '—'
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-500">状态变更时强制填写跟进记录或指定字段，校验通过后才允许保存。</p>
        <Button size="sm" onClick={() => setShowAdd(true)}>+ 新建策略</Button>
      </div>

      <div className="rounded-lg border bg-white overflow-hidden">
        {(!data || data.length === 0) ? (
          <p className="py-8 text-center text-sm text-gray-400">暂无策略</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-700">对象</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">触发条件</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">策略要求</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">状态</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((p) => (
                <tr key={p.id} className={p.isActive ? '' : 'opacity-50'}>
                  <td className="px-4 py-3 text-gray-700">{ENTITY_LABELS[p.entityType] ?? p.entityType}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {FIELD_LABELS[p.triggerField] ?? p.triggerField}
                    <span className="mx-1 text-gray-400">→</span>
                    <span className="font-medium">{STATUS_VALUE_LABELS[p.triggerValue] ?? p.triggerValue}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-xs">{formatPolicyConfig(p)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={p.isActive ? 'green' : 'gray'}>
                      {p.isActive ? '启用' : '禁用'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => toggle.mutate({ id: p.id, isActive: !p.isActive })}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        {p.isActive ? '禁用' : '启用'}
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        onClick={() => { if (confirm('确认删除此策略？')) deleteMutation.mutate(p.id) }}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAdd && (
        <Modal
          title="新建字段策略"
          onClose={() => setShowAdd(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setShowAdd(false)}>取消</Button>
              <Button
                loading={addMutation.isPending}
                disabled={!addForm.triggerValue.trim()}
                onClick={() => addMutation.mutate()}
              >
                创建
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">适用对象</label>
              <select
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={addForm.entityType}
                onChange={(e) => setAddForm((f) => ({ ...f, entityType: e.target.value }))}
              >
                <option value="lead">线索</option>
                <option value="client">客户</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">触发字段</label>
              <select
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={addForm.triggerField}
                onChange={(e) => setAddForm((f) => ({ ...f, triggerField: e.target.value }))}
              >
                <option value="status">状态</option>
                <option value="contractStatus">合同状态</option>
              </select>
            </div>
            <Input
              label="触发值（字段变为此值时触发）"
              placeholder="如 Lost、Contacted"
              value={addForm.triggerValue}
              onChange={(e) => setAddForm((f) => ({ ...f, triggerValue: e.target.value }))}
            />
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addForm.requireActivity}
                  onChange={(e) => setAddForm((f) => ({ ...f, requireActivity: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                要求填写跟进记录
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addForm.activityContentRequired}
                  onChange={(e) => setAddForm((f) => ({ ...f, activityContentRequired: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                跟进内容必填
              </label>
            </div>
            <Input
              label="快选预设（逗号分隔，可选）"
              placeholder="如 电话未接通,已加微信未回"
              value={addForm.contentPresets}
              onChange={(e) => setAddForm((f) => ({ ...f, contentPresets: e.target.value }))}
            />
            <p className="text-xs text-gray-400">注：「必填字段」（丢失原因/下次联系时间等）需通过迁移脚本配置</p>
          </div>
        </Modal>
      )}
    </div>
  )
}

function OptionGroupPanel({ groupKey, noAdd }: { groupKey: string; noAdd: boolean }) {
  const queryClient = useQueryClient()
  const [editTarget, setEditTarget] = useState<OptionItem | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [editColor, setEditColor] = useState<Color>('gray')
  const [addColor, setAddColor] = useState<Color>('gray')

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

  const editForm = useForm<OptionItemForm>({ resolver: zodResolver(optionItemSchema) })
  const addForm  = useForm<OptionItemForm>({ resolver: zodResolver(optionItemSchema), defaultValues: { color: 'gray' } })

  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }: { id: string } & OptionItemForm) =>
      crmApi.put(`/admin/options/items/${id}`, body),
    onSuccess: () => { setEditTarget(null); invalidate() },
  })

  const addMutation = useMutation({
    mutationFn: (body: OptionItemForm) =>
      crmApi.post('/admin/options/items', { ...body, groupKey }),
    onSuccess: () => { setShowAdd(false); addForm.reset(); setAddColor('gray'); invalidate() },
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
              <th className="px-4 py-3 text-left font-medium text-gray-700">状态</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data?.map((item) => (
              <tr key={item.id} className={item.isActive ? '' : 'opacity-50'}>
                <td className="px-4 py-3">
                  <span className={`inline-block w-4 h-4 rounded-full ${COLOR_CLASS[item.color] ?? 'bg-gray-200'}`} />
                </td>
                <td className="px-4 py-3 text-gray-500 font-mono text-xs">{item.value}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{item.label}</td>
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
                          onClick={() => { if (confirm(`确认删除「${item.label}」？`)) deleteMutation.mutate(item.id) }}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          删除
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
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
          </div>
        </Modal>
      )}

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
          </div>
        </Modal>
      )}
    </div>
  )
}

interface AiProvider {
  id: string
  name: string
  providerType: 'openai' | 'anthropic' | 'custom'
  apiKeyMasked: string
  baseUrl: string | null
  isActive: number
}

interface AiModel {
  id: string
  providerId: string
  providerName: string
  providerType: string
  modelId: string
  displayName: string
  isEnabled: number
}

interface AssignmentRule {
  id: string
  ruleType: string
  ruleTypeLabel: string
  priority: number
  configJson: string
  isActive: number
}

const RULE_DESCRIPTIONS: Record<string, string> = {
  round_robin:  '按顺序轮流分配给每位销售人员',
  load_balance: '分配给当前线索数最少的销售人员',
  skill_match:  '优先分配给专长与线索意向服务匹配的销售人员',
  region_match: '优先分配给所在区域与线索来源地区匹配的销售人员',
}

const schema = z.object({
  system_name:     z.string().min(1, '请填写系统名称'),
  smtp_host:       z.string(),
  smtp_port:       z.string(),
  smtp_secure:     z.string(),
  smtp_user:       z.string(),
  smtp_password:   z.string(),
  smtp_from_email: z.string(),
  smtp_from_name:  z.string(),
})
type SettingsForm = z.infer<typeof schema>

type Settings = Record<string, string>

const TABS = [
  { key: 'basic',      label: '基本配置' },
  { key: 'smtp',       label: '邮件服务器' },
  { key: 'teams',      label: '团队管理' },
  { key: 'assignment', label: '自动分配' },
  { key: 'ai',         label: 'AI 配置' },
  { key: 'options',    label: '选项配置' },
  { key: 'policies',   label: '字段策略' },
] as const
type TabKey = typeof TABS[number]['key']

const teamSchema = z.object({
  name:   z.string().min(1, '请填写团队名称'),
  region: z.string().optional(),
})
type TeamForm = z.infer<typeof teamSchema>

export default function SystemSettingsPage() {
  const queryClient = useQueryClient()
  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>('basic')
  const [editTarget, setEditTarget] = useState<Team | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [activeGroup, setActiveGroup] = useState(OPTION_GROUPS[0]!.key)

  // AI 配置相关 state
  const [showAddProvider, setShowAddProvider] = useState(false)
  const [aiProviderForm, setAiProviderForm] = useState({ name: '', providerType: 'openai', apiKey: '', baseUrl: '' })
  const [availableModels, setAvailableModels] = useState<{ id: string; name: string }[] | null>(null)
  const [loadingModelsFor, setLoadingModelsFor] = useState<string | null>(null)
  const [modelsProviderId, setModelsProviderId] = useState<string | null>(null)
  const [modelsError, setModelsError] = useState<string | null>(null)
  const [manualModel, setManualModel] = useState({ modelId: '', displayName: '' })
  const [testModelId, setTestModelId] = useState<string | null>(null)
  const [testPrompt, setTestPrompt] = useState('你好，请用一句话介绍你自己。')
  const [testResult, setTestResult] = useState<{ reply: string; latencyMs: number } | null>(null)
  const [testError, setTestError] = useState<string | null>(null)
  const [testLoading, setTestLoading] = useState(false)

  const runTest = async (modelId: string) => {
    setTestLoading(true)
    setTestResult(null)
    setTestError(null)
    try {
      const res = await crmApi.post<{ data: { reply: string; latencyMs: number } }>(
        `/admin/ai/models/${modelId}/test`,
        { prompt: testPrompt },
      )
      setTestResult(res.data.data)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '测试失败'
      setTestError(msg)
    } finally {
      setTestLoading(false)
    }
  }

  // 团队列表
  const { data: teams, isLoading: teamsLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: () => crmApi.get<{ data: Team[] }>('/teams').then((r) => r.data.data),
    enabled: activeTab === 'teams',
  })

  // AI 提供商 & 模型
  const { data: aiProvidersData, refetch: refetchProviders } = useQuery({
    queryKey: ['ai-providers'],
    queryFn: () => crmApi.get<{ data: AiProvider[] }>('/admin/ai/providers').then((r) => r.data.data),
    enabled: activeTab === 'ai',
  })
  const aiProviders = aiProvidersData ?? []

  const { data: aiModelsData, refetch: refetchModels } = useQuery({
    queryKey: ['ai-models'],
    queryFn: () => crmApi.get<{ data: AiModel[] }>('/admin/ai/models').then((r) => r.data.data),
    enabled: activeTab === 'ai',
  })
  const aiModels = aiModelsData ?? []

  const addProvider = useMutation({
    mutationFn: (body: typeof aiProviderForm) => crmApi.post('/admin/ai/providers', body),
    onSuccess: () => { setShowAddProvider(false); setAiProviderForm({ name: '', providerType: 'openai', apiKey: '', baseUrl: '' }); refetchProviders() },
  })

  const deleteProvider = useMutation({
    mutationFn: (id: string) => crmApi.delete(`/admin/ai/providers/${id}`),
    onSuccess: () => { refetchProviders(); refetchModels() },
  })

  const enableModel = useMutation({
    mutationFn: (body: { providerId: string; modelId: string; displayName: string }) =>
      crmApi.post('/admin/ai/models', body),
    onSuccess: () => refetchModels(),
  })

  const removeModel = useMutation({
    mutationFn: (id: string) => crmApi.delete(`/admin/ai/models/${id}`),
    onSuccess: () => refetchModels(),
  })

  const fetchAvailableModels = async (providerId: string) => {
    setLoadingModelsFor(providerId)
    setModelsProviderId(providerId)
    setAvailableModels(null)
    setModelsError(null)
    try {
      const res = await crmApi.get<{ data: { id: string; name: string }[] }>(
        `/admin/ai/providers/${providerId}/available-models`,
      )
      setAvailableModels(res.data.data)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '查询失败'
      setModelsError(msg)
    } finally {
      setLoadingModelsFor(null)
    }
  }

  const teamForm = useForm<TeamForm>({ resolver: zodResolver(teamSchema) })
  const addForm  = useForm<TeamForm>({ resolver: zodResolver(teamSchema) })

  const invalidateTeams = () => queryClient.invalidateQueries({ queryKey: ['teams'] })

  const updateTeam = useMutation({
    mutationFn: ({ id, ...body }: { id: string } & TeamForm) =>
      crmApi.put(`/teams/${id}`, body),
    onSuccess: () => { setEditTarget(null); invalidateTeams() },
  })

  const addTeam = useMutation({
    mutationFn: (body: TeamForm) => crmApi.post('/teams', body),
    onSuccess: () => { setShowAdd(false); addForm.reset(); invalidateTeams() },
  })

  const deleteTeam = useMutation({
    mutationFn: (id: string) => crmApi.delete(`/teams/${id}`),
    onSuccess: invalidateTeams,
  })

  const openEdit = (team: Team) => {
    setEditTarget(team)
    teamForm.reset({ name: team.name, region: team.region ?? '' })
  }

  // 分配规则
  const { data: rules, isLoading: rulesLoading } = useQuery({
    queryKey: ['assignment-rules'],
    queryFn: () =>
      crmApi.get<{ data: AssignmentRule[] }>('/admin/assignment-rules').then((r) => r.data.data),
    enabled: activeTab === 'assignment',
  })

  const updateRule = useMutation({
    mutationFn: ({ id, ...body }: { id: string; isActive?: boolean; priority?: number }) =>
      crmApi.put(`/admin/assignment-rules/${id}`, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assignment-rules'] }),
  })

  const toggleAutoAssign = useMutation({
    mutationFn: (enabled: boolean) =>
      crmApi.put('/admin/settings', { auto_assign_enabled: enabled ? 'true' : 'false' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['system-settings'] }),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['system-settings'],
    queryFn: () => crmApi.get<{ data: Settings }>('/admin/settings').then((r) => r.data.data),
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<SettingsForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      system_name: '', smtp_host: '', smtp_port: '465',
      smtp_secure: 'true', smtp_user: '', smtp_password: '', smtp_from_email: '', smtp_from_name: '',
    },
  })

  useEffect(() => {
    if (data) reset(data as SettingsForm)
  }, [data, reset])

  const saveMutation = useMutation({
    mutationFn: (body: SettingsForm) => crmApi.put('/admin/settings', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
  })

  if (isLoading) return <div className="p-6 text-sm text-gray-500">加载中...</div>

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-lg sm:text-xl font-semibold text-gray-900">系统管理</h1>
        <p className="mt-0.5 text-sm text-gray-500">配置系统基本信息和服务参数</p>
      </div>

      {/* Tab 切换 */}
      <div className="mb-4 flex gap-1 border-b">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === t.key
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))}>
        <div className="max-w-2xl">
          {activeTab === 'basic' && (
            <div className="rounded-lg border bg-white p-4 sm:p-6">
              <div className="space-y-3">
                <Input
                  label="系统名称"
                  error={errors.system_name?.message}
                  {...register('system_name')}
                />
              </div>
            </div>
          )}

          {activeTab === 'smtp' && (
            <div className="rounded-lg border bg-white p-4 sm:p-6">
              <p className="text-xs text-gray-500 mb-4">用于发送通知邮件、魔法链接等系统邮件</p>
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <Input label="SMTP 服务器" placeholder="smtp.example.com" {...register('smtp_host')} />
                  </div>
                  <Input label="端口" placeholder="465" {...register('smtp_port')} />
                </div>
                <Select
                  label="加密方式"
                  options={[
                    { value: 'true', label: 'SSL/TLS（推荐）' },
                    { value: 'false', label: '不加密' },
                  ]}
                  {...register('smtp_secure')}
                />
                <Input label="账号（用户名）" placeholder="your@email.com" {...register('smtp_user')} />
                <Input
                  label="密码 / 授权码"
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  {...register('smtp_password')}
                />
                <Input label="发件人邮箱" placeholder="noreply@example.com" {...register('smtp_from_email')} />
                <Input label="发件人名称" placeholder="辅助生殖 CRM" {...register('smtp_from_name')} />
              </div>
            </div>
          )}

          {activeTab !== 'teams' && activeTab !== 'assignment' && activeTab !== 'ai' && activeTab !== 'options' && activeTab !== 'policies' && (
            <div className="flex items-center gap-3 mt-4">
              <Button type="submit" loading={isSubmitting || saveMutation.isPending}>
                保存设置
              </Button>
              {saved && <span className="text-sm text-green-600">已保存</span>}
            </div>
          )}
        </div>
      </form>

      {/* 团队管理（独立于 form，避免嵌套表单） */}
      {activeTab === 'teams' && (
        <div className="max-w-2xl">
          <div className="rounded-lg border bg-white overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
              <span className="text-sm font-medium text-gray-700">团队列表</span>
              <Button size="sm" onClick={() => { setShowAdd(true); addForm.reset() }}>
                + 新建团队
              </Button>
            </div>

            {teamsLoading ? (
              <div className="py-8 text-center text-sm text-gray-400">加载中...</div>
            ) : !teams?.length ? (
              <div className="py-8 text-center text-sm text-gray-400">暂无团队</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">团队名称</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">区域</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {teams.map((team) => (
                    <tr key={team.id}>
                      <td className="px-4 py-3 font-medium text-gray-900">{team.name}</td>
                      <td className="px-4 py-3 text-gray-500">{team.region ?? '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => openEdit(team)}
                            className="text-xs text-primary-600 hover:text-primary-800"
                          >
                            编辑
                          </button>
                          <span className="text-gray-300">|</span>
                          <button
                            onClick={() => {
                              if (confirm(`确认删除团队「${team.name}」？成员将被移出该团队。`)) {
                                deleteTeam.mutate(team.id)
                              }
                            }}
                            className="text-xs text-red-500 hover:text-red-700"
                          >
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* 编辑弹窗 */}
          {editTarget && (
            <Modal
              title={`编辑团队：${editTarget.name}`}
              onClose={() => setEditTarget(null)}
              footer={
                <>
                  <Button variant="secondary" onClick={() => setEditTarget(null)}>取消</Button>
                  <Button
                    loading={updateTeam.isPending}
                    onClick={teamForm.handleSubmit((d) =>
                      updateTeam.mutate({ id: editTarget.id, ...d })
                    )}
                  >
                    保存
                  </Button>
                </>
              }
            >
              <div className="space-y-3">
                <Input
                  label="团队名称"
                  error={teamForm.formState.errors.name?.message}
                  {...teamForm.register('name')}
                />
                <Input
                  label="区域（可选）"
                  placeholder="如：华东、北京"
                  {...teamForm.register('region')}
                />
              </div>
            </Modal>
          )}

          {/* 新建弹窗 */}
          {showAdd && (
            <Modal
              title="新建团队"
              onClose={() => { setShowAdd(false); addForm.reset() }}
              footer={
                <>
                  <Button variant="secondary" onClick={() => { setShowAdd(false); addForm.reset() }}>
                    取消
                  </Button>
                  <Button
                    loading={addTeam.isPending}
                    onClick={addForm.handleSubmit((d) => addTeam.mutate(d))}
                  >
                    创建
                  </Button>
                </>
              }
            >
              <div className="space-y-3">
                <Input
                  label="团队名称"
                  error={addForm.formState.errors.name?.message}
                  {...addForm.register('name')}
                />
                <Input
                  label="区域（可选）"
                  placeholder="如：华东、北京"
                  {...addForm.register('region')}
                />
              </div>
            </Modal>
          )}
        </div>
      )}

      {/* 自动分配（独立于 form） */}
      {activeTab === 'assignment' && (
        <div className="max-w-2xl space-y-4">
          {/* 全局开关 */}
          <div className="rounded-lg border bg-white p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">自动分配开关</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  开启后，新建线索将根据下方规则自动分配给销售人员
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const current = data?.auto_assign_enabled !== 'false'
                  toggleAutoAssign.mutate(!current)
                }}
                disabled={toggleAutoAssign.isPending}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  data?.auto_assign_enabled !== 'false' ? 'bg-primary-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200 ease-in-out ${
                    data?.auto_assign_enabled !== 'false' ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* 分配规则列表 */}
          <div className="rounded-lg border bg-white overflow-hidden">
            <div className="px-4 py-3 border-b bg-gray-50">
              <p className="text-sm font-medium text-gray-700">分配规则</p>
              <p className="mt-0.5 text-xs text-gray-500">规则按优先级顺序依次尝试，第一个匹配成功的规则生效</p>
            </div>

            {rulesLoading ? (
              <div className="py-8 text-center text-sm text-gray-400">加载中...</div>
            ) : !rules?.length ? (
              <div className="py-8 text-center text-sm text-gray-400">暂无规则</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-700 w-8">优先级</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">规则名称</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">说明</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-700">启用</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-700">调整顺序</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[...rules].sort((a, b) => a.priority - b.priority).map((rule, idx, arr) => (
                    <tr key={rule.id} className={rule.isActive ? '' : 'opacity-50'}>
                      <td className="px-4 py-3 text-center text-gray-400 text-xs">{rule.priority}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{rule.ruleTypeLabel}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{RULE_DESCRIPTIONS[rule.ruleType] ?? '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => updateRule.mutate({ id: rule.id, isActive: rule.isActive === 0 })}
                          className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                            rule.isActive ? 'bg-primary-600' : 'bg-gray-200'
                          }`}
                        >
                          <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${
                            rule.isActive ? 'translate-x-4' : 'translate-x-0'
                          }`} />
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => {
                              const prev = arr[idx - 1]!
                              updateRule.mutate({ id: rule.id, priority: prev.priority })
                              updateRule.mutate({ id: prev.id, priority: rule.priority })
                            }}
                            className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                            title="上移"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            disabled={idx === arr.length - 1}
                            onClick={() => {
                              const next = arr[idx + 1]!
                              updateRule.mutate({ id: rule.id, priority: next.priority })
                              updateRule.mutate({ id: next.id, priority: rule.priority })
                            }}
                            className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                            title="下移"
                          >
                            ↓
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
      {/* 选项配置 */}
      {activeTab === 'options' && (
        <div>
          <div className="mb-4 flex gap-1 border-b">
            {OPTION_GROUPS.map((g) => (
              <button
                key={g.key}
                type="button"
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
          <OptionGroupPanel
            key={activeGroup}
            groupKey={activeGroup}
            noAdd={OPTION_GROUPS.find((g) => g.key === activeGroup)?.noAdd ?? false}
          />
        </div>
      )}

      {/* 字段策略 */}
      {activeTab === 'policies' && <FieldPoliciesPanel />}

      {/* AI 配置 */}
      {activeTab === 'ai' && (
        <div className="space-y-6">
          {/* 模型提供商 */}
          <div className="rounded-lg border bg-white overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
              <h2 className="font-semibold text-gray-800 text-sm">模型提供商</h2>
              <Button size="sm" onClick={() => setShowAddProvider(true)}>+ 添加</Button>
            </div>

            {/* 添加提供商表单 */}
            {showAddProvider && (
              <div className="p-4 border-b bg-blue-50 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="名称"
                    placeholder="如：OpenAI"
                    value={aiProviderForm.name}
                    onChange={(e) => setAiProviderForm((f) => ({ ...f, name: e.target.value }))}
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
                    <select
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      value={aiProviderForm.providerType}
                      onChange={(e) => setAiProviderForm((f) => ({ ...f, providerType: e.target.value }))}
                    >
                      <option value="openai">OpenAI</option>
                      <option value="anthropic">Anthropic</option>
                      <option value="custom">自定义（OpenAI 兼容）</option>
                    </select>
                  </div>
                  <Input
                    label="API Key"
                    placeholder="sk-..."
                    value={aiProviderForm.apiKey}
                    onChange={(e) => setAiProviderForm((f) => ({ ...f, apiKey: e.target.value }))}
                  />
                  {aiProviderForm.providerType !== 'anthropic' && (
                    <div>
                      <Input
                        label={aiProviderForm.providerType === 'openai' ? 'Base URL（可选，留空用官方地址）' : 'Base URL'}
                        placeholder="https://api.openai.com/v1"
                        value={aiProviderForm.baseUrl}
                        onChange={(e) => setAiProviderForm((f) => ({ ...f, baseUrl: e.target.value }))}
                      />
                      <p className="mt-1 text-xs text-gray-400">
                        填写到 /v1 为止，不含 /chat/completions 等端点路径
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    loading={addProvider.isPending}
                    onClick={() => addProvider.mutate(aiProviderForm)}
                    disabled={!aiProviderForm.name || !aiProviderForm.apiKey}
                  >
                    保存
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setShowAddProvider(false)}>取消</Button>
                </div>
              </div>
            )}

            {aiProviders.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-400 text-center">暂未添加提供商</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">名称</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">类型</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">API Key</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Base URL</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {aiProviders.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-medium text-gray-900">{p.name}</td>
                      <td className="px-4 py-2.5 text-gray-500 capitalize">{p.providerType}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{p.apiKeyMasked}</td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs">{p.baseUrl ?? '—'}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => fetchAvailableModels(p.id)}
                            disabled={loadingModelsFor === p.id}
                            className="text-xs text-primary-600 hover:text-primary-800 font-medium disabled:opacity-50"
                          >
                            {loadingModelsFor === p.id ? '查询中...' : '查询模型'}
                          </button>
                          <span className="text-gray-300">|</span>
                          <button
                            onClick={() => { if (confirm(`确认删除提供商「${p.name}」及其所有已启用模型？`)) deleteProvider.mutate(p.id) }}
                            className="text-xs text-red-500 hover:text-red-700"
                          >
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* 查询到的可用模型 */}
          {modelsProviderId && (
            <div className="rounded-lg border bg-white overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
                <h2 className="font-semibold text-gray-800 text-sm">
                  可用模型 — {aiProviders.find((p) => p.id === modelsProviderId)?.name}
                </h2>
                <button onClick={() => { setModelsProviderId(null); setAvailableModels(null); setModelsError(null) }}
                  className="text-xs text-gray-400 hover:text-gray-600">关闭</button>
              </div>

              {modelsError ? (
                <div className="px-4 py-4 space-y-3">
                  <p className="text-sm text-red-500">{modelsError}</p>
                  <div className="rounded-md border border-gray-200 bg-gray-50 p-3 space-y-2">
                    <p className="text-xs font-medium text-gray-600">该提供商不支持自动查询模型，请手动输入模型 ID：</p>
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-1">模型 ID</label>
                        <input
                          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                          placeholder="如 @cf/meta/llama-3.1-8b-instruct"
                          value={manualModel.modelId}
                          onChange={(e) => setManualModel((m) => ({ ...m, modelId: e.target.value }))}
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-1">显示名称</label>
                        <input
                          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                          placeholder="如 Llama 3.1 8B"
                          value={manualModel.displayName}
                          onChange={(e) => setManualModel((m) => ({ ...m, displayName: e.target.value }))}
                        />
                      </div>
                      <Button
                        size="sm"
                        disabled={!manualModel.modelId || !manualModel.displayName || enableModel.isPending}
                        loading={enableModel.isPending}
                        onClick={() => {
                          enableModel.mutate(
                            { providerId: modelsProviderId!, modelId: manualModel.modelId, displayName: manualModel.displayName },
                            { onSuccess: () => setManualModel({ modelId: '', displayName: '' }) },
                          )
                        }}
                      >
                        添加
                      </Button>
                    </div>
                  </div>
                </div>
              ) : !availableModels ? (
                <p className="px-4 py-4 text-sm text-gray-400">加载中...</p>
              ) : (
                <div className="max-h-72 overflow-y-auto divide-y divide-gray-100">
                  {availableModels.map((m) => {
                    const already = aiModels.some(
                      (em) => em.providerId === modelsProviderId && em.modelId === m.id,
                    )
                    return (
                      <div key={m.id} className="flex items-center justify-between px-4 py-2.5">
                        <div>
                          <span className="text-sm font-medium text-gray-800">{m.name}</span>
                          {m.name !== m.id && <span className="ml-2 text-xs text-gray-400">{m.id}</span>}
                        </div>
                        {already ? (
                          <span className="text-xs text-green-600 font-medium">已启用</span>
                        ) : (
                          <button
                            onClick={() => enableModel.mutate({
                              providerId: modelsProviderId!,
                              modelId: m.id,
                              displayName: m.name,
                            })}
                            disabled={enableModel.isPending}
                            className="text-xs text-primary-600 hover:text-primary-800 font-medium disabled:opacity-50"
                          >
                            启用
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* 已启用模型 */}
          <div className="rounded-lg border bg-white overflow-hidden">
            <div className="px-4 py-3 border-b bg-gray-50">
              <h2 className="font-semibold text-gray-800 text-sm">已启用模型</h2>
            </div>
            {aiModels.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-400 text-center">暂无已启用模型，请先添加提供商并查询模型</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {aiModels.map((m) => (
                  <div key={m.id}>
                    <div className="flex items-center px-4 py-2.5 hover:bg-gray-50">
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-gray-900 text-sm">{m.displayName}</span>
                        <span className="ml-2 font-mono text-xs text-gray-400">{m.modelId}</span>
                        <span className="ml-2 text-xs text-gray-400">· {m.providerName}</span>
                      </div>
                      <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                        <button
                          onClick={() => {
                            if (testModelId === m.id) {
                              setTestModelId(null); setTestResult(null); setTestError(null)
                            } else {
                              setTestModelId(m.id); setTestResult(null); setTestError(null)
                            }
                          }}
                          className={`text-xs font-medium ${testModelId === m.id ? 'text-gray-400' : 'text-primary-600 hover:text-primary-800'}`}
                        >
                          {testModelId === m.id ? '收起' : '测试'}
                        </button>
                        <span className="text-gray-300">|</span>
                        <button
                          onClick={() => { if (confirm(`确认移除模型「${m.displayName}」？`)) removeModel.mutate(m.id) }}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          移除
                        </button>
                      </div>
                    </div>

                    {/* 测试面板 */}
                    {testModelId === m.id && (
                      <div className="px-4 pb-4 pt-2 bg-gray-50 border-t border-gray-100 space-y-3">
                        <div className="flex gap-2">
                          <input
                            className="flex-1 rounded border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                            value={testPrompt}
                            onChange={(e) => setTestPrompt(e.target.value)}
                            placeholder="输入测试消息..."
                            onKeyDown={(e) => { if (e.key === 'Enter' && !testLoading) runTest(m.id) }}
                          />
                          <Button
                            size="sm"
                            loading={testLoading}
                            disabled={!testPrompt.trim()}
                            onClick={() => runTest(m.id)}
                          >
                            发送
                          </Button>
                        </div>
                        {testLoading && (
                          <p className="text-xs text-gray-400">请求中...</p>
                        )}
                        {testError && (
                          <div className="rounded bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600">
                            {testError}
                          </div>
                        )}
                        {testResult && (
                          <div className="rounded bg-white border border-gray-200 px-3 py-2 space-y-1">
                            <p className="text-sm text-gray-800 whitespace-pre-wrap">{testResult.reply}</p>
                            <p className="text-xs text-gray-400">响应时间：{testResult.latencyMs} ms</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
