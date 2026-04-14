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
import type { User, Team, UserRole } from '@/shared/types'

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
  role: z.enum(['admin', 'operations', 'sales']),
  teamId: z.string().optional(),
})

const editSchema = z.object({
  name: z.string().min(1, '请填写姓名'),
  role: z.enum(['admin', 'operations', 'sales']),
  teamId: z.string().optional(),
  capacity: z.coerce.number().int().min(1).max(100),
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

export default function UsersPage() {
  const queryClient = useQueryClient()
  const [showRegister, setShowRegister] = useState(false)
  const [editTarget, setEditTarget] = useState<User | null>(null)
  const [resetTarget, setResetTarget] = useState<User | null>(null)

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => crmApi.get<{ data: User[] }>('/users').then((r) => r.data),
  })

  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: () => crmApi.get<{ data: Team[] }>('/teams').then((r) => r.data),
  })

  const teamOptions = [
    { value: '', label: '无团队' },
    ...(teams?.data.map((t) => ({ value: t.id, label: t.name })) ?? []),
  ]

  const registerForm = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) })
  const editForm = useForm<EditForm>({ resolver: zodResolver(editSchema) })
  const resetPasswordForm = useForm<ResetPasswordForm>({ resolver: zodResolver(resetPasswordSchema) })

  const openEdit = (u: User) => {
    editForm.reset({
      name: u.name,
      role: u.role,
      teamId: u.teamId ?? '',
      capacity: u.capacity,
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

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">用户管理</h1>
        <Button onClick={() => setShowRegister(true)}>新建用户</Button>
      </div>

      <div className="rounded-lg border bg-white overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center text-sm text-gray-500">加载中...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-700">姓名</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">邮箱</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">角色</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">当前线索 / 容量</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users?.data.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{user.name}</td>
                  <td className="px-4 py-3 text-gray-500">{user.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant={roleBadge[user.role]}>{roleLabel[user.role]}</Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-gray-200 max-w-[80px]">
                        <div
                          className="h-full rounded-full bg-primary-500"
                          style={{ width: `${Math.min(100, (user.currentLeadsCount / user.capacity) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs">{user.currentLeadsCount}/{user.capacity}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(user)}>
                        编辑
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openResetPassword(user)}>
                        重置密码
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

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
            <Input label="线索容量" type="number" {...editForm.register('capacity')} />
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
