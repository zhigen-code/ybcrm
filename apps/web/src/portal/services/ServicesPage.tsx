import { useQuery } from '@tanstack/react-query'
import { portalApi } from '@/shared/utils/request'
import { Badge } from '@/shared/components/Badge'

interface ServiceWithStatus {
  id: string
  name: string
  description: string | null
  process_steps: string // JSON string
  contractStatus: string | null
}

export default function PortalServicesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['portal', 'services'],
    queryFn: () =>
      portalApi.get<{ data: ServiceWithStatus[] }>('/services').then((r) => r.data.data),
  })

  if (isLoading) return <div className="text-sm text-gray-500">加载中...</div>

  if (!data?.length) {
    return (
      <div className="max-w-xl">
        <h1 className="text-xl font-semibold text-gray-900 mb-6">服务进度</h1>
        <div className="rounded-xl border bg-white p-12 text-center text-sm text-gray-500">
          暂无服务记录，请联系您的顾问了解详情
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">服务进度</h1>

      {data.map((service) => {
        const steps: string[] = (() => {
          try { return JSON.parse(service.process_steps) } catch { return [] }
        })()

        return (
          <div key={service.id} className="rounded-xl border bg-white p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">{service.name}</h2>
              {service.contractStatus && (
                <Badge variant={service.contractStatus === '已签署' ? 'green' : 'yellow'}>
                  合同{service.contractStatus}
                </Badge>
              )}
            </div>

            {service.description && (
              <p className="mt-2 text-sm text-gray-500">{service.description}</p>
            )}

            {steps.length > 0 && (
              <div className="mt-6">
                <p className="text-xs font-medium text-gray-500 mb-3">服务流程</p>
                <ol className="relative border-l border-gray-200 space-y-4 ml-3">
                  {steps.map((step, i) => (
                    <li key={i} className="ml-4">
                      <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">
                        {i + 1}
                      </span>
                      <p className="text-sm text-gray-700">{step}</p>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
