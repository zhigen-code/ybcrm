import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useCrmAuth } from './CrmAuthContext'
import { crmApi } from '@/shared/utils/request'
import { Input } from '@/shared/components/Input'
import { Button } from '@/shared/components/Button'
import { useState, useEffect } from 'react'

const schema = z.object({
  email: z.string().email('请输入有效邮箱'),
  password: z.string().min(6, '密码至少 6 位'),
})
type FormData = z.infer<typeof schema>

export default function CrmLoginPage() {
  const { login } = useCrmAuth()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState('')

  const { data: publicSettings } = useQuery({
    queryKey: ['public-settings'],
    queryFn: () => crmApi.get<{ data: { systemName: string } }>('/public/settings').then((r) => r.data.data),
    staleTime: 1000 * 60 * 60,
  })
  const systemName = publicSettings?.systemName ?? 'CRM'
  useEffect(() => { document.title = systemName }, [systemName])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    setServerError('')
    try {
      await login(data.email, data.password)
      navigate('/app/leads', { replace: true })
    } catch {
      setServerError('邮箱或密码错误，请重试')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">{systemName}</h1>
          <p className="mt-1 text-sm text-gray-500">内部管理系统</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            id="email"
            label="邮箱"
            type="email"
            autoComplete="username"
            placeholder="you@company.com"
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            id="password"
            label="密码"
            type="password"
            autoComplete="current-password"
            placeholder="请输入密码"
            error={errors.password?.message}
            {...register('password')}
          />

          {serverError && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{serverError}</p>
          )}

          <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
            登录
          </Button>
        </form>
      </div>
    </div>
  )
}
