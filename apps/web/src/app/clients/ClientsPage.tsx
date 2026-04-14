import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { crmApi } from '@/shared/utils/request'
import { Input } from '@/shared/components/Input'
import { Badge } from '@/shared/components/Badge'
import { formatDate } from '@/shared/utils/format'
import type { Client } from '@/shared/types'

const contractBadge: Record<string, 'gray' | 'yellow' | 'green' | 'red'> = {
  '待签署': 'yellow',
  '已签署': 'green',
  '已终止': 'red',
}

export default function ClientsPage() {
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => crmApi.get<{ data: Client[] }>('/clients').then((r) => r.data),
  })

  const filtered = data?.data.filter((c) =>
    !search || c.name.includes(search) || c.email?.includes(search) || c.phone?.includes(search),
  )

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-gray-900">客户档案</h1>
          <p className="mt-0.5 text-xs sm:text-sm text-gray-500">共 {data?.data.length ?? 0} 位客户</p>
        </div>
      </div>

      <div className="mb-4">
        <Input
          placeholder="搜索姓名、邮箱、电话..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-gray-500">加载中...</div>
      ) : !filtered?.length ? (
        <div className="py-12 text-center text-sm text-gray-500">暂无客户</div>
      ) : (
        <>
          {/* 桌面端表格 */}
          <div className="hidden sm:block rounded-lg border bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">姓名</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">联系方式</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">服务套餐</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">合同状态</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">创建人</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">创建时间</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{client.name}</td>
                    <td className="px-4 py-3 text-gray-600">
                      <div>{client.phone ?? '—'}</div>
                      {client.email && <div className="text-xs text-gray-400">{client.email}</div>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {(client.servicePlans ?? []).join('、') || '—'}
                    </td>
                    <td className="px-4 py-3">
                      {client.contractStatus ? (
                        <Badge variant={contractBadge[client.contractStatus] ?? 'gray'}>
                          {client.contractStatus}
                        </Badge>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{client.createdByName ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(client.createdAt)}</td>
                    <td className="px-4 py-3">
                      <Link to={`/app/clients/${client.id}`} className="text-primary-600 hover:underline">
                        查看
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 移动端卡片列表 */}
          <div className="sm:hidden space-y-3">
            {filtered.map((client) => (
              <Link
                key={client.id}
                to={`/app/clients/${client.id}`}
                className="block rounded-lg border bg-white p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{client.name}</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {client.phone ?? client.email ?? '无联系方式'}
                    </p>
                  </div>
                  {client.contractStatus ? (
                    <Badge variant={contractBadge[client.contractStatus] ?? 'gray'} className="flex-shrink-0">
                      {client.contractStatus}
                    </Badge>
                  ) : null}
                </div>
                <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                  <span>{(client.servicePlans ?? []).join('、') || '未指定套餐'}</span>
                  <span className="ml-auto">{formatDate(client.createdAt)}</span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
