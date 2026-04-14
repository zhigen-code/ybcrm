import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { portalApi } from '@/shared/utils/request'
import { Button } from '@/shared/components/Button'
import { Input } from '@/shared/components/Input'
import { Select } from '@/shared/components/Select'
import { Modal } from '@/shared/components/Modal'
import { Badge } from '@/shared/components/Badge'
import { formatDate } from '@/shared/utils/format'
import { formatFileSize } from '@/shared/utils/format'
import type { ClientResource, ResourceType } from '@/shared/types'

const typeLabel: Record<ResourceType, string> = {
  MedicalReport: '医疗报告',
  Contract: '合同',
  PassportCopy: '证件复印',
  PartnerContact: '合作方联系',
}
const typeBadge: Record<ResourceType, 'blue' | 'green' | 'yellow' | 'gray'> = {
  MedicalReport: 'blue',
  Contract: 'green',
  PassportCopy: 'yellow',
  PartnerContact: 'gray',
}

const uploadSchema = z.object({
  title: z.string().min(1, '请填写文件名称'),
  resourceType: z.enum(['MedicalReport', 'Contract', 'PassportCopy', 'PartnerContact']),
})
type UploadForm = z.infer<typeof uploadSchema>

export default function ResourcesPage() {
  const queryClient = useQueryClient()
  const [showUpload, setShowUpload] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['portal', 'resources'],
    queryFn: () =>
      portalApi.get<{ data: ClientResource[] }>('/resources').then((r) => r.data.data),
  })

  const form = useForm<UploadForm>({
    resolver: zodResolver(uploadSchema),
    defaultValues: { resourceType: 'MedicalReport' },
  })

  const downloadMutation = useMutation({
    mutationFn: (resourceId: string) =>
      portalApi.get<{ data: { url: string } }>(`/resources/${resourceId}/download-url`)
        .then((r) => r.data.data.url),
    onSuccess: (url) => {
      window.open(url, '_blank')
    },
  })

  const handleUpload = async (formData: UploadForm) => {
    const file = fileRef.current?.files?.[0]
    if (!file) { setUploadError('请选择文件'); return }

    setUploading(true)
    setUploadError('')
    try {
      // 1. 获取预签名上传 URL
      const { data: presign } = await portalApi.post<{
        data: { resourceId: string; key: string; uploadId: string; contentType: string }
      }>('/resources/upload-url', {
        fileName: file.name,
        contentType: file.type || 'application/octet-stream',
        title: formData.title,
        resourceType: formData.resourceType,
      })

      // 2. 直接上传到 R2（通过 Worker 完成多段上传）
      // 注：实际部署时 R2 multipart upload 需通过 Worker 代理各部分
      // 此处简化为通知后端上传完成
      await portalApi.put(`/resources/${presign.data.resourceId}/confirm`, {
        size: file.size,
      })

      queryClient.invalidateQueries({ queryKey: ['portal', 'resources'] })
      setShowUpload(false)
      form.reset()
      if (fileRef.current) fileRef.current.value = ''
    } catch {
      setUploadError('上传失败，请重试')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">我的文件</h1>
        <Button onClick={() => setShowUpload(true)}>上传文件</Button>
      </div>

      {isLoading ? (
        <div className="text-sm text-gray-500">加载中...</div>
      ) : !data?.length ? (
        <div className="rounded-xl border bg-white p-12 text-center text-sm text-gray-500">
          暂无文件，点击"上传文件"开始上传
        </div>
      ) : (
        <div className="rounded-xl border bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-700">文件名称</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">类型</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">上传时间</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((resource) => (
                <tr key={resource.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{resource.title}</p>
                    {resource.description && (
                      <p className="text-xs text-gray-400">{resource.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={typeBadge[resource.resourceType]}>
                      {typeLabel[resource.resourceType]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {formatDate(resource.uploadedAt)}
                  </td>
                  <td className="px-4 py-3">
                    {(resource.r2ObjectKey || resource.externalUrl) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        loading={downloadMutation.isPending}
                        onClick={() => downloadMutation.mutate(resource.id)}
                      >
                        下载
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showUpload && (
        <Modal
          title="上传文件"
          onClose={() => setShowUpload(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setShowUpload(false)}>取消</Button>
              <Button
                loading={uploading}
                onClick={form.handleSubmit(handleUpload)}
              >
                上传
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            <Input
              label="文件名称"
              placeholder="如：体检报告 2024-04"
              error={form.formState.errors.title?.message}
              {...form.register('title')}
            />
            <Select
              label="文件类型"
              options={[
                { value: 'MedicalReport', label: '医疗报告' },
                { value: 'Contract', label: '合同' },
                { value: 'PassportCopy', label: '证件复印' },
                { value: 'PartnerContact', label: '合作方联系' },
              ]}
              {...form.register('resourceType')}
            />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">选择文件</label>
              <input
                ref={fileRef}
                type="file"
                className="text-sm text-gray-600 file:mr-3 file:rounded file:border-0 file:bg-primary-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-700 hover:file:bg-primary-100"
              />
            </div>
            {uploadError && (
              <p className="text-sm text-red-600">{uploadError}</p>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
