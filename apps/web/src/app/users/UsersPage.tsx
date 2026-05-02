import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { crmApi } from '@/shared/utils/request'
import { Button } from '@/shared/components/Button'
import { Input } from '@/shared/components/Input'
import { Select } from '@/shared/components/Select'
import { Modal } from '@/shared/components/Modal'
import { Badge } from '@/shared/components/Badge'
import type { User, Team, UserRole, Service } from '@/shared/types'

const roleBadge: Record<UserRole, 'red' | 'blue' | 'green'> = {
  admin: 'red', operations: 'blue', sales: 'green',
}
const roleLabel: Record<UserRole, string> = {
  admin: '管理员', operations: '运营', sales: '销售',
}

const registerSchema = z.object({
  email: z.string().email('请输入有效邮箱'),
  password: z.string().min(8, '密码至少 8 位'),
  name: z.string().min(1, '请填写姓名'),
  phone: z.string().optional(),
  role: z.enum(['admin', 'operations', 'sales']),
  teamId: z.string().optional(),
})

const editSchema = z.object({
  name: z.string().min(1, '请填写姓名'),
  phone: z.string().optional(),
  role: z.enum(['admin', 'operations', 'sales']),
  teamId: z.string().optional(),
  specialization: z.array(z.string()),
})

const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, '密码至少 8 位'),
  confirmPassword: z.string().min(1, '请确认密码'),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: '两次密码不一致',
  path: ['confirmPassword'],
})

type RegisterForm = z.infer<typeof registerSchema>
type EditForm = z.infer<typeof editSchema>
type ResetPasswordForm = z.infer<typeof resetPasswordSchema>

function parseSpecialization(val: unknown): string[] {
  if (Array.isArray(val)) return val
  if (typeof val === 'string') {
    try { return JSON.parse(val) } catch { /* ignore */ }
  }
  return []
}

import { Pagination } from '@/shared/components/Pagination'

const PAGE_SIZE = 20

export default function UsersPage() {
  const queryClient = useQueryClient()
  const [showRegister, setShowRegister] = useState(false)
  const [editTarget, setEditTarget] = useState<User | null>(null)
  const [resetTarget, setResetTarget] = useState<User | null>(null)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)

  const searchTimeout = useState<ReturnType<typeof setTimeout> | null>(null)
  const handleSearch = (val: string) => {
    setSearch(val)
    if (searchTimeout[0]) clearTimeout(searchTimeout[0])
    searchTimeout[1](setTimeout(() => { setDebouncedSearch(val); setPage(1) }, 300))
  }

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['users', debouncedSearch, page],
    queryFn: () => crmApi.get<{ data: User[]; total: number; page: number; pageSize: number }>('/users', {
      params: { search: debouncedSearch || undefined, page, pageSize: PAGE_SIZE },
    }).then((r) => r.data),
  })

  const users = usersData?.data ?? []
  const total = usersData?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: () => crmApi.get<{ data: Team[] }>('/teams').then((r) => r.data),
  })

  const { data: servicesResp } = useQuery({
    queryKey: ['services'],
    queryFn: () => crmApi.get<{ data: Service[] }>('/services').then((r) => r.data),
  })
  const serviceNames = (servicesResp?.data ?? []).map((s) => s.name)

  const teamOptions = [
    { value: '', label: '无团队' },
    ...((teams?.data ?? []).map((t) => ({ value: t.id, label: t.name }))),
  ]

  const registerForm = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) })
  const editForm = useForm<EditForm>({ resolver: zodResolver(editSchema) })
  const resetPasswordForm = useForm<ResetPasswordForm>({ resolver: zodResolver(resetPasswordSchema) })

  const openEdit = (u: User) => {
    editForm.reset({
      name: u.name,
      phone: u.phone ?? '',
      role: u.role,
      teamId: u.teamId ?? '',
      specialization: parseSpecialization(u.specialization),
    })
    setEditTarget(u)
  }

  const openResetPassword = (u: User) => {
    resetPasswordForm.reset()
    setResetTarget(u)
  }

  const registerMutation = useMutation({
    mutationFn: (body: RegisterForm) =>
      crmApi.post('/auth/register', { ...body, teamId: body.teamId || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setShowRegister(false)
      registerForm.reset()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '创建失败'
      registerForm.setError('email', { message: msg })
    },
  })

  const editMutation = useMutation({
    mutationFn: (body: EditForm) =>
      crmApi.put(`/users/${editTarget!.id}`, { ...body, teamId: body.teamId || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setEditTarget(null)
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '保存失败'
      editForm.setError('name', { message: msg })
    },
  })

  const resetPasswordMutation = useMutation({
    mutationFn: ({ newPassword }: ResetPasswordForm) =>
      crmApi.put(`/users/${resetTarget!.id}/password`, { newPassword }),
    onSuccess: () => {
      setResetTarget(null)
      resetPasswordForm.reset()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '重置失败'
      resetPasswordForm.setError('newPassword', { message: msg })
    },
  })

  const toggleActiveMutation = useMutation({
    mutationFn: (user: User) =>
      crmApi.put(`/users/${user.id}`, { isActive: !user.isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 sm:mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">用户管理</h1>
          <p className="mt-0.5 text-sm text-gray-500">共 {total} 名用户</p>
        </div>
        <Button onClick={() => setShowRegister(true)}>新建用户</Button>
      </div>

      <div className="mb-4">
        <Input placeholder="搜索姓名、邮箱..." value={search} onChange={(e) => handleSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-gray-500">加载中...</div>
      ) : (
        <>
          {/* 移动端：卡片列表 */}
          <div className="space-y-3 sm:hidden">
            {users.map((user) => (
              <div key={user.id} className={`rounded-lg border bg-white p-4 ${!user.isActive ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="font-medium text-gray-900">
                      {user.name}
                      {!user.isActive && <span className="ml-2 text-xs text-red-500 font-normal">已禁用</span>}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{user.email}</p>
                    {user.phone && <p className="text-xs text-gray-400 mt-0.5">{user.phone}</p>}
                  </div>
                  <Badge variant={roleBadge[user.role]}>{roleLabel[user.role]}</Badge>
                </div>

                <div className="flex items-center gap-3 mb-2 text-xs text-gray-500">
                  <span>线索 <span className="font-medium text-gray-700">{user.currentLeadsCount}</span></span>
                  <span>客户 <span className="font-medium text-gray-700">{user.currentClientsCount ?? 0}</span></span>
                </div>

                {/* 专长 */}
                {(() => {
                  const specs = parseSpecialization(user.specialization)
                  return specs.length > 0 ? (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {specs.map((s) => (
                        <Badge key={s} variant="blue">{s}</Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 mb-3">专长未设置</p>
                  )
                })()}

                <div className="flex gap-2 border-t pt-3">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(user)}>编辑</Button>
                  <Button variant="ghost" size="sm" onClick={() => openResetPassword(user)}>重置密码</Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={user.isActive ? 'text-red-500' : 'text-green-600'}
                    onClick={() => {
                      const action = user.isActive ? '禁用' : '启用'
                      if (confirm(`确认${action}用户「${user.name}」？`)) toggleActiveMutation.mutate(user)
                    }}
                  >
                    {user.isActive ? '禁用' : '启用'}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* 桌面端：表格 */}
          <div className="hidden sm:block rounded-lg border bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">姓名</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">邮箱</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">电话</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">角色</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">专长服务</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">线索 / 客户</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((user) => (
                  <tr key={user.id} className={`hover:bg-gray-50 ${!user.isActive ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {user.name}
                      {!user.isActive && <span className="ml-2 text-xs text-red-500 font-normal">已禁用</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{user.email}</td>
                    <td className="px-4 py-3 text-gray-500">{user.phone ?? <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3">
                      <Badge variant={roleBadge[user.role]}>{roleLabel[user.role]}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const specs = parseSpecialization(user.specialization)
                        return specs.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {specs.map((s) => (
                              <Badge key={s} variant="blue">{s}</Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">未设置</span>
                        )
                      })()}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      <span>线索 <span className="font-medium text-gray-800">{user.currentLeadsCount}</span></span>
                      <span className="mx-1.5 text-gray-300">/</span>
                      <span>客户 <span className="font-medium text-gray-800">{user.currentClientsCount ?? 0}</span></span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(user)}>
                          编辑
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openResetPassword(user)}>
                          重置密码
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={user.isActive ? 'text-red-500 hover:text-red-700' : 'text-green-600 hover:text-green-800'}
                          onClick={() => {
                            const action = user.isActive ? '禁用' : '启用'
                            if (confirm(`确认${action}用户「${user.name}」？`)) toggleActiveMutation.mutate(user)
                          }}
                        >
                          {user.isActive ? '禁用' : '启用'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </>
      )}

      {/* 新建用户 */}
      {showRegister && (
        <Modal
          title="新建用户"
          onClose={() => setShowRegister(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setShowRegister(false)}>取消</Button>
              <Button
                loading={registerMutation.isPending}
                onClick={registerForm.handleSubmit((d) => registerMutation.mutate(d))}
              >
                创建
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            <Input label="姓名" error={registerForm.formState.errors.name?.message} {...registerForm.register('name')} />
            <Input label="电话" placeholder="选填" {...registerForm.register('phone')} />
            <Input label="邮箱" type="email" error={registerForm.formState.errors.email?.message} {...registerForm.register('email')} />
            <Input label="初始密码" type="password" error={registerForm.formState.errors.password?.message} {...registerForm.register('password')} />
            <Select
              label="角色"
              options={[
                { value: 'admin', label: '管理员' },
                { value: 'operations', label: '运营' },
                { value: 'sales', label: '销售' },
              ]}
              {...registerForm.register('role')}
            />
            <Select label="所属团队" options={teamOptions} {...registerForm.register('teamId')} />
          </div>
        </Modal>
      )}

      {/* 编辑用户 */}
      {editTarget && (
        <Modal
          title={`编辑用户 · ${editTarget.name}`}
          onClose={() => setEditTarget(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setEditTarget(null)}>取消</Button>
              <Button
                loading={editMutation.isPending}
                onClick={editForm.handleSubmit((d) => editMutation.mutate(d))}
              >
                保存
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            <Input label="姓名" error={editForm.formState.errors.name?.message} {...editForm.register('name')} />
            <Input label="电话" placeholder="选填" {...editForm.register('phone')} />
            <Select
              label="角色"
              options={[
                { value: 'admin', label: '管理员' },
                { value: 'operations', label: '运营' },
                { value: 'sales', label: '销售' },
              ]}
              {...editForm.register('role')}
            />
            <Select label="所属团队" options={teamOptions} {...editForm.register('teamId')} />
            <div>
              <p className="mb-1.5 text-sm font-medium text-gray-700">
                专长服务
                <span className="ml-1 text-xs font-normal text-gray-400">（用于专长匹配自动分配）</span>
              </p>
              {serviceNames.length === 0 ? (
                <p className="text-xs text-gray-400">请先在服务管理中创建服务</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {serviceNames.map((name) => {
                    const cur = editForm.watch('specialization')
                    const selected = Array.isArray(cur) && cur.includes(name)
                    return (
                      <button
                        key={name}
                        type="button"
                        onClick={() => {
                          const cur = editForm.getValues('specialization')
                          const curArr = Array.isArray(cur) ? cur : []
                          editForm.setValue(
                            'specialization',
                            selected ? curArr.filter((s) => s !== name) : [...curArr, name],
                          )
                        }}
                        className={`rounded-full px-3 py-1 text-sm font-medium border transition-colors ${
                          selected
                            ? 'bg-primary-600 text-white border-primary-600'
                            : 'bg-white text-gray-600 border-gray-300 hover:border-primary-400'
                        }`}
                      >
                        {name}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* 重置密码 */}
      {resetTarget && (
        <Modal
          title={`重置密码 · ${resetTarget.name}`}
          onClose={() => setResetTarget(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setResetTarget(null)}>取消</Button>
              <Button
                loading={resetPasswordMutation.isPending}
                onClick={resetPasswordForm.handleSubmit((d) => resetPasswordMutation.mutate(d))}
              >
                确认重置
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            <p className="text-sm text-gray-500">
              为 <span className="font-medium text-gray-700">{resetTarget.name}</span> 设置新密码，该用户下次登录需使用新密码。
            </p>
            <Input
              label="新密码"
              type="password"
              autoComplete="new-password"
              error={resetPasswordForm.formState.errors.newPassword?.message}
              {...resetPasswordForm.register('newPassword')}
            />
            <Input
              label="确认新密码"
              type="password"
              autoComplete="new-password"
              error={resetPasswordForm.formState.errors.confirmPassword?.message}
              {...resetPasswordForm.register('confirmPassword')}
            />
          </div>
        </Modal>
      )}
    </div>
  )
}
