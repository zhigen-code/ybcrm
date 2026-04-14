import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useEffect, useState } from 'react'
import { crmApi } from '@/shared/utils/request'
import { Input } from '@/shared/components/Input'
import { Button } from '@/shared/components/Button'
import { Select } from '@/shared/components/Select'

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

export default function SystemSettingsPage() {
  const queryClient = useQueryClient()
  const [saved, setSaved] = useState(false)

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
    <div className="p-4 sm:p-6 max-w-2xl">
      <h1 className="text-lg sm:text-xl font-semibold text-gray-900 mb-6">系统管理</h1>

      <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="space-y-6">
        {/* 基本配置 */}
        <div className="rounded-lg border bg-white p-4 sm:p-6">
          <h2 className="font-medium text-gray-900 mb-4">基本配置</h2>
          <div className="space-y-3">
            <Input
              label="系统名称"
              error={errors.system_name?.message}
              {...register('system_name')}
            />
          </div>
        </div>

        {/* 邮件服务器配置 */}
        <div className="rounded-lg border bg-white p-4 sm:p-6">
          <h2 className="font-medium text-gray-900 mb-1">邮件服务器配置</h2>
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

        <div className="flex items-center gap-3">
          <Button type="submit" loading={isSubmitting || saveMutation.isPending}>
            保存设置
          </Button>
          {saved && <span className="text-sm text-green-600">已保存</span>}
        </div>
      </form>
    </div>
  )
}
