import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { crmApi } from '@/shared/utils/request'
import { useCrmAuth } from '@/app/auth/CrmAuthContext'
import { Input } from '@/shared/components/Input'
import { Button } from '@/shared/components/Button'
import { Modal } from '@/shared/components/Modal'
import { formatDate } from '@/shared/utils/format'

const TABS = [
  { key: 'info',     label: '基本信息' },
  { key: 'password', label: '修改密码' },
  { key: 'api',      label: 'API 接入' },
] as const
type TabKey = typeof TABS[number]['key']

const nameSchema = z.object({
  name: z.string().min(1, '请填写姓名'),
})
const passwordSchema = z.object({
  currentPassword: z.string().min(1, '请输入当前密码'),
  newPassword: z.string().min(8, '新密码至少 8 位'),
  confirmPassword: z.string().min(1, '请确认新密码'),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: '两次密码不一致',
  path: ['confirmPassword'],
})
const apiKeySchema = z.object({
  name: z.string().min(1, '请填写用途说明').max(50),
})

type NameForm = z.infer<typeof nameSchema>
type PasswordForm = z.infer<typeof passwordSchema>
type ApiKeyForm = z.infer<typeof apiKeySchema>

interface ApiKey {
  id: string
  name: string
  keyPrefix: string
  createdAt: string
  lastUsedAt: string | null
}

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? ''

// ---- 基本信息 Tab ----
function InfoTab() {
  const { user, updateUser } = useCrmAuth()
  const [saved, setSaved] = useState(false)
  const form = useForm<NameForm>({
    resolver: zodResolver(nameSchema),
    defaultValues: { name: user?.name ?? '' },
  })
  const mutation = useMutation({
    mutationFn: (body: NameForm) =>
      crmApi.put<{ data: { name: string } }>('/auth/profile', body),
    onSuccess: (res) => {
      updateUser({ name: res.data.data.name })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '操作失败'
      form.setError('name', { message: msg })
    },
  })
  return (
    <div className="rounded-lg border bg-white p-4 sm:p-6 max-w-lg">
      <div className="mb-4 text-sm text-gray-500">
        邮箱：<span className="text-gray-700">{user?.email}</span>
        <span className="ml-3 text-gray-400">·</span>
        <span className="ml-3">角色：<span className="text-gray-700">{user?.role}</span></span>
      </div>
      <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-3">
        <Input
          label="显示姓名"
          error={form.formState.errors.name?.message}
          {...form.register('name')}
        />
        <div className="flex items-center gap-3 pt-1">
          <Button type="submit" size="sm" loading={mutation.isPending}>保存姓名</Button>
          {saved && <span className="text-sm text-green-600">已保存</span>}
        </div>
      </form>
    </div>
  )
}

// ---- 修改密码 Tab ----
function PasswordTab() {
  const [saved, setSaved] = useState(false)
  const form = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) })
  const mutation = useMutation({
    mutationFn: ({ currentPassword, newPassword }: PasswordForm) =>
      crmApi.put('/auth/profile', { currentPassword, newPassword }),
    onSuccess: () => {
      form.reset()
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '操作失败'
      form.setError('currentPassword', { message: msg })
    },
  })
  return (
    <div className="rounded-lg border bg-white p-4 sm:p-6 max-w-lg">
      <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-3">
        <Input label="当前密码" type="password" autoComplete="current-password"
          error={form.formState.errors.currentPassword?.message} {...form.register('currentPassword')} />
        <Input label="新密码" type="password" autoComplete="new-password"
          error={form.formState.errors.newPassword?.message} {...form.register('newPassword')} />
        <Input label="确认新密码" type="password" autoComplete="new-password"
          error={form.formState.errors.confirmPassword?.message} {...form.register('confirmPassword')} />
        <div className="flex items-center gap-3 pt-1">
          <Button type="submit" size="sm" loading={mutation.isPending}>修改密码</Button>
          {saved && <span className="text-sm text-green-600">密码已修改</span>}
        </div>
      </form>
    </div>
  )
}

// ---- API 接入 Tab ----
function ApiTab() {
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [newKey, setNewKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: () => crmApi.get<{ data: ApiKey[] }>('/auth/api-keys').then((r) => r.data.data),
  })

  const form = useForm<ApiKeyForm>({ resolver: zodResolver(apiKeySchema) })

  const createMutation = useMutation({
    mutationFn: (body: ApiKeyForm) =>
      crmApi.post<{ data: { id: string; name: string; keyPrefix: string; key: string } }>('/auth/api-keys', body),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
      setShowCreate(false)
      form.reset()
      setNewKey(res.data.data.key)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => crmApi.delete(`/auth/api-keys/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['api-keys'] }),
  })

  const copyKey = () => {
    if (!newKey) return
    navigator.clipboard.writeText(newKey).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const endpoint = `${API_BASE}/api/v1/leads`

  return (
    <div className="space-y-4 max-w-2xl">
      {/* 新密钥展示 */}
      {newKey && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-800 mb-2">请立即复制 API Key，此后不再显示</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 break-all rounded bg-white border border-amber-200 px-3 py-2 text-sm font-mono text-gray-800">
              {newKey}
            </code>
            <Button size="sm" variant="secondary" onClick={copyKey}>
              {copied ? '已复制' : '复制'}
            </Button>
          </div>
          <button
            className="mt-2 text-xs text-amber-600 hover:text-amber-800 underline"
            onClick={() => setNewKey(null)}
          >
            我已保存，关闭提示
          </button>
        </div>
      )}

      {/* Key 列表 */}
      <div className="rounded-lg border bg-white overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="font-medium text-gray-900 text-sm">API Keys</h2>
          <Button size="sm" onClick={() => setShowCreate(true)}>生成新 Key</Button>
        </div>
        {isLoading ? (
          <div className="p-4 text-sm text-gray-400">加载中...</div>
        ) : !data?.length ? (
          <div className="p-4 text-sm text-gray-400">暂无 API Key，点击右上角生成</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-700">用途</th>
                <th className="px-4 py-2 text-left font-medium text-gray-700">Key 前缀</th>
                <th className="px-4 py-2 text-left font-medium text-gray-700">创建时间</th>
                <th className="px-4 py-2 text-left font-medium text-gray-700">最后使用</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((k) => (
                <tr key={k.id}>
                  <td className="px-4 py-2.5 font-medium text-gray-900">{k.name}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{k.keyPrefix}...</td>
                  <td className="px-4 py-2.5 text-gray-500">{formatDate(k.createdAt)}</td>
                  <td className="px-4 py-2.5 text-gray-500">{k.lastUsedAt ? formatDate(k.lastUsedAt) : '从未'}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => { if (confirm(`确认吊销「${k.name}」？`)) deleteMutation.mutate(k.id) }}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      吊销
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* API 文档 */}
      <div className="rounded-lg border bg-white p-4 sm:p-5">
        <h2 className="font-medium text-gray-900 mb-3 text-sm">接口说明</h2>
        <div className="space-y-3 text-sm">
          <div>
            <p className="text-gray-500 mb-1">提交新线索</p>
            <code className="block rounded bg-gray-50 border px-3 py-2 text-xs font-mono text-gray-700">
              POST {endpoint}
            </code>
          </div>
          <div>
            <p className="text-gray-500 mb-1">请求头</p>
            <code className="block rounded bg-gray-50 border px-3 py-2 text-xs font-mono text-gray-700 whitespace-pre">{`Content-Type: application/json\nX-API-Key: <你的 API Key>`}</code>
          </div>
          <div>
            <p className="text-gray-500 mb-1">请求体（JSON）</p>
            <code className="block rounded bg-gray-50 border px-3 py-2 text-xs font-mono text-gray-700 whitespace-pre">{`{\n  "source": "官网表单",\n  "name": "张三",\n  "contactInfo": "13800138000",\n  "intendedServices": ["赴美试管"],\n  "notes": "备注（可选）"\n}`}</code>
          </div>
          <div>
            <p className="text-gray-500 mb-1">cURL 示例</p>
            <code className="block rounded bg-gray-50 border px-3 py-2 text-xs font-mono text-gray-700 whitespace-pre">{`curl -X POST ${endpoint} \\\n  -H "Content-Type: application/json" \\\n  -H "X-API-Key: crm_your_key_here" \\\n  -d '{"source":"官网","name":"张三","contactInfo":"138xxxx","intendedServices":["赴美试管"]}'`}</code>
          </div>
          <div>
            <p className="text-gray-500 mb-1">成功响应（201）</p>
            <code className="block rounded bg-gray-50 border px-3 py-2 text-xs font-mono text-gray-700">{`{ "data": { "id": "uuid", "status": "New" } }`}</code>
          </div>
        </div>
      </div>

      {/* 生成 Key 弹窗 */}
      {showCreate && (
        <Modal
          title="生成 API Key"
          onClose={() => { setShowCreate(false); form.reset() }}
          footer={
            <>
              <Button variant="secondary" onClick={() => { setShowCreate(false); form.reset() }}>取消</Button>
              <Button loading={createMutation.isPending} onClick={form.handleSubmit((d) => createMutation.mutate(d))}>
                生成
              </Button>
            </>
          }
        >
          <Input
            label="用途说明"
            placeholder="如：官网表单、小程序接入"
            error={form.formState.errors.name?.message}
            {...form.register('name')}
          />
        </Modal>
      )}
    </div>
  )
}

// ---- 主页面 ----
export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<TabKey>('info')

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-lg sm:text-xl font-semibold text-gray-900">个人设置</h1>
        <p className="mt-0.5 text-sm text-gray-500">管理账号信息和 API 接入配置</p>
      </div>

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

      {activeTab === 'info'     && <InfoTab />}
      {activeTab === 'password' && <PasswordTab />}
      {activeTab === 'api'      && <ApiTab />}
    </div>
  )
}
