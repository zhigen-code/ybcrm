import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { crmApi } from '@/shared/utils/request'
import { useCrmAuth } from '@/app/auth/CrmAuthContext'
import { Input } from '@/shared/components/Input'
import { Button } from '@/shared/components/Button'

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

type NameForm = z.infer<typeof nameSchema>
type PasswordForm = z.infer<typeof passwordSchema>

export default function ProfilePage() {
  const { user, updateUser } = useCrmAuth()
  const [nameSaved, setNameSaved] = useState(false)
  const [pwSaved, setPwSaved] = useState(false)

  const nameForm = useForm<NameForm>({
    resolver: zodResolver(nameSchema),
    defaultValues: { name: user?.name ?? '' },
  })

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  })

  const updateName = useMutation({
    mutationFn: (body: NameForm) => crmApi.put<{ data: { name: string; email: string; role: string } }>('/auth/profile', body),
    onSuccess: (res) => {
      updateUser({ name: res.data.data.name })
      setNameSaved(true)
      setTimeout(() => setNameSaved(false), 3000)
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '操作失败'
      nameForm.setError('name', { message: msg })
    },
  })

  const updatePassword = useMutation({
    mutationFn: ({ currentPassword, newPassword }: PasswordForm) =>
      crmApi.put('/auth/profile', { currentPassword, newPassword }),
    onSuccess: () => {
      passwordForm.reset()
      setPwSaved(true)
      setTimeout(() => setPwSaved(false), 3000)
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '操作失败'
      passwordForm.setError('currentPassword', { message: msg })
    },
  })

  return (
    <div className="p-4 sm:p-6 max-w-xl">
      <h1 className="text-lg sm:text-xl font-semibold text-gray-900 mb-6">个人设置</h1>

      {/* 基本信息 */}
      <div className="rounded-lg border bg-white p-4 sm:p-6 mb-6">
        <h2 className="font-medium text-gray-900 mb-4">基本信息</h2>
        <div className="mb-3 text-sm text-gray-500">
          邮箱：<span className="text-gray-700">{user?.email}</span>
        </div>
        <form
          onSubmit={nameForm.handleSubmit((d) => updateName.mutate(d))}
          className="space-y-3"
        >
          <Input
            label="显示姓名"
            error={nameForm.formState.errors.name?.message}
            {...nameForm.register('name')}
          />
          <div className="flex items-center gap-3 pt-1">
            <Button type="submit" size="sm" loading={updateName.isPending}>
              保存姓名
            </Button>
            {nameSaved && <span className="text-sm text-green-600">已保存</span>}
          </div>
        </form>
      </div>

      {/* 修改密码 */}
      <div className="rounded-lg border bg-white p-4 sm:p-6">
        <h2 className="font-medium text-gray-900 mb-4">修改密码</h2>
        <form
          onSubmit={passwordForm.handleSubmit((d) => updatePassword.mutate(d))}
          className="space-y-3"
        >
          <Input
            label="当前密码"
            type="password"
            autoComplete="current-password"
            error={passwordForm.formState.errors.currentPassword?.message}
            {...passwordForm.register('currentPassword')}
          />
          <Input
            label="新密码"
            type="password"
            autoComplete="new-password"
            error={passwordForm.formState.errors.newPassword?.message}
            {...passwordForm.register('newPassword')}
          />
          <Input
            label="确认新密码"
            type="password"
            autoComplete="new-password"
            error={passwordForm.formState.errors.confirmPassword?.message}
            {...passwordForm.register('confirmPassword')}
          />
          <div className="flex items-center gap-3 pt-1">
            <Button type="submit" size="sm" loading={updatePassword.isPending}>
              修改密码
            </Button>
            {pwSaved && <span className="text-sm text-green-600">密码已修改</span>}
          </div>
        </form>
      </div>
    </div>
  )
}
