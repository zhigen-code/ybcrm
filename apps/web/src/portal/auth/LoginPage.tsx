import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { usePortalAuth } from './PortalAuthContext'
import { crmApi } from '@/shared/utils/request'
import { Input } from '@/shared/components/Input'
import { Button } from '@/shared/components/Button'

const passwordSchema = z.object({
  email: z.string().email('请输入有效邮箱'),
  password: z.string().min(6, '密码至少 6 位'),
})
const magicLinkSchema = z.object({
  email: z.string().email('请输入有效邮箱'),
})
type PasswordForm = z.infer<typeof passwordSchema>
type MagicLinkForm = z.infer<typeof magicLinkSchema>

export default function PortalLoginPage() {
  const { login, sendMagicLink, verifyMagicLink } = usePortalAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [mode, setMode] = useState<'password' | 'magiclink'>('password')
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [serverError, setServerError] = useState('')

  const { data: publicSettings } = useQuery({
    queryKey: ['public-settings'],
    queryFn: () => crmApi.get<{ data: { systemName: string } }>('/public/settings').then((r) => r.data.data),
    staleTime: 1000 * 60 * 60,
  })
  const systemName = publicSettings?.systemName ?? '客户服务门户'
  useEffect(() => { document.title = systemName }, [systemName])

  // 处理 Magic Link 回调
  useEffect(() => {
    const token = searchParams.get('token')
    if (token) {
      verifyMagicLink(token)
        .then(() => navigate('/portal/profile', { replace: true }))
        .catch(() => setServerError('链接已失效，请重新登录'))
    }
  }, [searchParams, verifyMagicLink, navigate])

  const passwordForm = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) })
  const magicLinkForm = useForm<MagicLinkForm>({ resolver: zodResolver(magicLinkSchema) })

  const onPasswordSubmit = async (data: PasswordForm) => {
    setServerError('')
    try {
      await login(data.email, data.password)
      navigate('/portal/profile', { replace: true })
    } catch {
      setServerError('邮箱或密码错误，请重试')
    }
  }

  const onMagicLinkSubmit = async (data: MagicLinkForm) => {
    setServerError('')
    try {
      await sendMagicLink(data.email)
      setMagicLinkSent(true)
    } catch {
      setServerError('发送失败，请检查邮箱是否正确')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">{systemName}</h1>
          <p className="mt-1 text-sm text-gray-500">欢迎回来，请登录查看您的服务进度</p>
        </div>

        {/* 模式切换 */}
        <div className="mb-6 flex rounded-lg border p-1">
          <button
            onClick={() => setMode('password')}
            className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
              mode === 'password' ? 'bg-primary-600 text-white' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            密码登录
          </button>
          <button
            onClick={() => setMode('magiclink')}
            className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
              mode === 'magiclink' ? 'bg-primary-600 text-white' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            邮件一键登录
          </button>
        </div>

        {mode === 'password' ? (
          <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
            <Input
              id="email"
              label="邮箱"
              type="email"
              autoComplete="username"
              placeholder="your@email.com"
              error={passwordForm.formState.errors.email?.message}
              {...passwordForm.register('email')}
            />
            <Input
              id="password"
              label="密码"
              type="password"
              autoComplete="current-password"
              placeholder="请输入密码"
              error={passwordForm.formState.errors.password?.message}
              {...passwordForm.register('password')}
            />
            {serverError && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{serverError}</p>
            )}
            <Button
              type="submit"
              className="w-full"
              size="lg"
              loading={passwordForm.formState.isSubmitting}
            >
              登录
            </Button>
          </form>
        ) : magicLinkSent ? (
          <div className="rounded-lg bg-green-50 p-4 text-center text-sm text-green-700">
            <p className="font-medium">登录链接已发送！</p>
            <p className="mt-1">请查收邮件并点击链接完成登录。链接 15 分钟内有效。</p>
            <button
              onClick={() => setMagicLinkSent(false)}
              className="mt-3 text-green-600 underline"
            >
              重新发送
            </button>
          </div>
        ) : (
          <form onSubmit={magicLinkForm.handleSubmit(onMagicLinkSubmit)} className="space-y-4">
            <Input
              id="ml-email"
              label="邮箱"
              type="email"
              placeholder="your@email.com"
              error={magicLinkForm.formState.errors.email?.message}
              {...magicLinkForm.register('email')}
            />
            {serverError && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{serverError}</p>
            )}
            <Button
              type="submit"
              className="w-full"
              size="lg"
              loading={magicLinkForm.formState.isSubmitting}
            >
              发送登录链接
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
