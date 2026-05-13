import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useCrmAuth } from './CrmAuthContext'
import { crmApi } from '@/shared/utils/request'
import { Input } from '@/shared/components/Input'
import { Button } from '@/shared/components/Button'
import { useState, useEffect } from 'react'

export default function CrmLoginPage() {
  const { t } = useTranslation()
  const { login } = useCrmAuth()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState('')

  const schema = z.object({
    email: z.string().email(t('auth.invalidEmail')),
    password: z.string().min(6, t('auth.passwordMin')),
  })
  type FormData = z.infer<typeof schema>

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
      setServerError(t('auth.loginFailed'))
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">{systemName}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('auth.title')}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            id="email"
            label={t('auth.email')}
            type="email"
            autoComplete="username"
            placeholder="you@company.com"
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            id="password"
            label={t('auth.password')}
            type="password"
            autoComplete="current-password"
            placeholder={t('auth.enterPassword')}
            error={errors.password?.message}
            {...register('password')}
          />

          {serverError && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{serverError}</p>
          )}

          <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
            {t('auth.login')}
          </Button>
        </form>
      </div>
    </div>
  )
}
