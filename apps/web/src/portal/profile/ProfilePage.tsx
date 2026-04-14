import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { portalApi } from '@/shared/utils/request'
import { Button } from '@/shared/components/Button'
import { Input } from '@/shared/components/Input'
import { Badge } from '@/shared/components/Badge'
import { formatDate } from '@/shared/utils/format'

interface ClientProfile {
  id: string
  name: string
  email: string | null
  phone: string | null
  servicePlans: string[]
  contractStatus: string | null
  createdAt: string
}

const nameSchema = z.object({ name: z.string().min(1, '请填写姓名') })
const phoneSchema = z.object({ phone: z.string().nullable().optional() })
const passwordSchema = z.object({
  currentPassword: z.string().min(1, '请输入当前密码'),
  newPassword: z.string().min(8, '新密码至少 8 位'),
  confirmPassword: z.string().min(1, '请确认新密码'),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: '两次密码不一致',
  path: ['confirmPassword'],
})

type NameForm = z.infer<typeof nameSchema>
type PhoneForm = z.infer<typeof phoneSchema>
type PasswordForm = z.infer<typeof passwordSchema>

export default function ProfilePage() {
  const queryClient = useQueryClient()
  const [nameSaved, setNameSaved] = useState(false)
  const [pwSaved, setPwSaved] = useState(false)

  const { data: profile, isLoading } = useQuery({
    queryKey: ['portal', 'profile'],
    queryFn: () => portalApi.get<{ data: ClientProfile }>('/profile').then((r) => r.data.data),
  })

  const nameForm = useForm<NameForm>({
    resolver: zodResolver(nameSchema),
    values: { name: profile?.name ?? '' },
  })

  const phoneForm = useForm<PhoneForm>({
    resolver: zodResolver(phoneSchema),
    values: { phone: profile?.phone ?? '' },
  })

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  })

  const updateName = useMutation({
    mutationFn: (body: NameForm) => portalApi.put('/profile', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal', 'profile'] })
      setNameSaved(true)
      setTimeout(() => setNameSaved(false), 3000)
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '操作失败'
      nameForm.setError('name', { message: msg })
    },
  })

  const updatePhone = useMutation({
    mutationFn: (body: PhoneForm) => portalApi.put('/profile', body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['portal', 'profile'] }),
  })

  const updatePassword = useMutation({
    mutationFn: ({ currentPassword, newPassword }: PasswordForm) =>
      portalApi.put('/profile', { currentPassword, newPassword }),
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

  if (isLoading) return <div className="text-sm text-gray-500">加载中...</div>
  if (!profile) return null

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">个人资料</h1>

      {/* 基本信息展示 */}
      <div className="rounded-xl border bg-white p-6 space-y-5">
        {profile.email && (
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">邮箱</p>
            <p className="mt-1 text-gray-900">{profile.email}</p>
          </div>
        )}

        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">服务套餐</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {(profile.servicePlans ?? []).length > 0
              ? (profile.servicePlans ?? []).map((p) => <Badge key={p} variant="blue">{p}</Badge>)
              : <span className="text-gray-400 text-sm">暂无</span>}
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">合同状态</p>
          <p className="mt-1">
            {profile.contractStatus ? (
              <Badge variant={profile.contractStatus === '已签署' ? 'green' : 'yellow'}>
                {profile.contractStatus}
              </Badge>
            ) : (
              <span className="text-gray-400 text-sm">—</span>
            )}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">注册时间</p>
          <p className="mt-1 text-gray-600 text-sm">{formatDate(profile.createdAt)}</p>
        </div>
      </div>

      {/* 修改姓名 */}
      <div className="rounded-xl border bg-white p-6">
        <h2 className="font-medium text-gray-900 mb-4">修改姓名</h2>
        <form onSubmit={nameForm.handleSubmit((d) => updateName.mutate(d))} className="space-y-3">
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

      {/* 更新联系电话 */}
      <div className="rounded-xl border bg-white p-6">
        <h2 className="font-medium text-gray-900 mb-4">更新联系电话</h2>
        <form onSubmit={phoneForm.handleSubmit((d) => updatePhone.mutate(d))} className="flex gap-3">
          <div className="flex-1">
            <Input placeholder="请输入手机号码" {...phoneForm.register('phone')} />
          </div>
          <Button type="submit" loading={updatePhone.isPending}>
            保存
          </Button>
        </form>
        {updatePhone.isSuccess && (
          <p className="mt-2 text-sm text-green-600">已更新</p>
        )}
      </div>

      {/* 修改密码 */}
      <div className="rounded-xl border bg-white p-6">
        <h2 className="font-medium text-gray-900 mb-4">修改密码</h2>
        <form onSubmit={passwordForm.handleSubmit((d) => updatePassword.mutate(d))} className="space-y-3">
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
