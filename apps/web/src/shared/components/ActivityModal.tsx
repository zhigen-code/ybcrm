import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { crmApi } from '@/shared/utils/request'
import { Modal } from './Modal'
import { Button } from './Button'
import { Select } from './Select'
import { Textarea } from './Textarea'
import { Input } from './Input'
import { useOptionGroup, useOptions, toSelectOptions } from '@/shared/hooks/useOptions'
import type { ActivityAttachment } from '@/shared/types'
import type { FieldPolicyConfig } from '@/shared/hooks/useFieldPolicies'

const schema = z.object({
  activityType: z.string().min(1, '请选择跟进类型'),
  description: z.string().optional(),
  activityDate: z.string().min(1, '请选择时间'),
})
type FormData = z.infer<typeof schema>

export interface ActivitySubmitData {
  activityType: string
  description?: string | undefined
  activityDate: string
  attachmentKeys: ActivityAttachment[]
  policyFields?: Record<string, unknown> | undefined
}

interface ActivityModalProps {
  title: string
  onClose: () => void
  onSubmit: (data: ActivitySubmitData) => void
  loading: boolean
  policyConfig?: FieldPolicyConfig | null
  initialPolicyValues?: Record<string, unknown>
  serverError?: string | undefined
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function ActivityModal({
  title, onClose, onSubmit, loading, policyConfig, initialPolicyValues, serverError,
}: ActivityModalProps) {
  const { options: allActivityTypeOpts } = useOptionGroup('activity_type')
  const activityTypeOpts = allActivityTypeOpts.filter((o) => o.value !== 'System')
  const { data: allOptions } = useOptions()

  const hasServicesField = policyConfig?.requiredFields?.some((f) => f.type === 'services') ?? false
  const { data: servicesData } = useQuery({
    queryKey: ['services'],
    queryFn: () =>
      crmApi.get<{ data: { id: string; name: string }[] }>('/services').then((r) => r.data),
    enabled: hasServicesField,
    staleTime: 1000 * 60 * 5,
  })
  const services = servicesData?.data ?? []

  const [policyFields, setPolicyFields] = useState<Record<string, unknown>>(initialPolicyValues ?? {})
  const [policyError, setPolicyError] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      activityType: activityTypeOpts[0]?.value ?? '',
      activityDate: new Date().toISOString().slice(0, 16),
    },
  })

  const description = watch('description')

  const setPolicyField = (field: string, value: unknown) => {
    setPolicyFields((prev) => ({ ...prev, [field]: value }))
    setPolicyError('')
  }

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return
    setFiles((prev) => [...prev, ...Array.from(incoming)])
    setUploadError('')
  }

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleSave = handleSubmit(async (formData) => {
    // 校验策略必填字段
    if (policyConfig?.activityContentRequired && !formData.description?.trim()) {
      setPolicyError('请填写跟进内容')
      return
    }
    for (const rf of policyConfig?.requiredFields ?? []) {
      const val = policyFields[rf.field]
      if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
        setPolicyError(`请填写${rf.label}`)
        return
      }
    }

    setUploadError('')
    let attachmentKeys: ActivityAttachment[] = []
    if (files.length > 0) {
      setUploading(true)
      try {
        const results = await Promise.all(
          files.map(async (file) => {
            const fd = new FormData()
            fd.append('file', file)
            const res = await crmApi.post<{ data: ActivityAttachment }>('/upload/internal', fd)
            return res.data.data
          }),
        )
        attachmentKeys = results
      } catch {
        setUploadError('文件上传失败，请重试')
        setUploading(false)
        return
      }
      setUploading(false)
    }

    onSubmit({
      ...formData,
      attachmentKeys,
      policyFields: Object.keys(policyFields).length > 0 ? policyFields : undefined,
    })
  })

  const busy = uploading || loading

  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>取消</Button>
          <Button loading={busy} onClick={handleSave}>
            {uploading ? '上传中...' : '保存'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {/* 跟进类型和时间置顶，统一 h-8 高度 */}
        <div className="flex gap-2">
          <div className="flex-1 min-w-0">
            <label className="block text-xs text-gray-500 mb-1">跟进类型</label>
            <select
              className="w-full h-8 rounded-md border border-gray-300 bg-white px-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
              {...register('activityType')}
            >
              {toSelectOptions(activityTypeOpts).map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="flex-none">
            <label className="block text-xs text-gray-500 mb-1">时间</label>
            <input
              type="datetime-local"
              className="h-8 rounded-md border border-gray-300 px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
              {...register('activityDate')}
            />
            {errors.activityDate?.message && (
              <p className="mt-0.5 text-xs text-red-600">{errors.activityDate.message}</p>
            )}
          </div>
        </div>

        {/* 快选预设 */}
        {(policyConfig?.contentPresets?.length ?? 0) > 0 && (
          <div>
            <p className="mb-1.5 text-xs text-gray-500">快速选择</p>
            <div className="flex flex-wrap gap-1.5">
              {policyConfig!.contentPresets!.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setValue('description', preset)}
                  className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                    description === preset
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-primary-400'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        )}

        <Textarea
          label={policyConfig?.activityContentRequired ? '内容（必填）' : '内容'}
          placeholder="记录本次跟进的要点..."
          {...register('description')}
        />

        {/* 策略要求的额外字段 */}
        {(policyConfig?.requiredFields?.length ?? 0) > 0 && (
          <div className="border-t pt-3 space-y-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">必填信息</p>
            {policyConfig!.requiredFields!.map((rf) => {
              if (rf.type === 'select' && rf.optionGroup) {
                const opts = allOptions?.[rf.optionGroup] ?? []
                return (
                  <div key={rf.field}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{rf.label}</label>
                    <select
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      value={(policyFields[rf.field] as string) ?? ''}
                      onChange={(e) => setPolicyField(rf.field, e.target.value)}
                    >
                      <option value="">请选择...</option>
                      {toSelectOptions(opts).map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                )
              }
              if (rf.type === 'datetime') {
                return (
                  <Input
                    key={rf.field}
                    type="datetime-local"
                    label={rf.label}
                    value={(policyFields[rf.field] as string) ?? ''}
                    onChange={(e) => setPolicyField(rf.field, e.target.value)}
                  />
                )
              }
              if (rf.type === 'services') {
                const selected = (policyFields[rf.field] as string[]) ?? []
                return (
                  <div key={rf.field}>
                    <p className="text-sm font-medium text-gray-700 mb-1.5">{rf.label}</p>
                    <div className="flex flex-wrap gap-2">
                      {services.map((svc) => (
                        <button
                          key={svc.id}
                          type="button"
                          onClick={() => {
                            const next = selected.includes(svc.name)
                              ? selected.filter((s) => s !== svc.name)
                              : [...selected, svc.name]
                            setPolicyField(rf.field, next)
                          }}
                          className={`rounded-full px-3 py-1 text-sm font-medium border transition-colors ${
                            selected.includes(svc.name)
                              ? 'bg-primary-600 text-white border-primary-600'
                              : 'bg-white text-gray-600 border-gray-300 hover:border-primary-400'
                          }`}
                        >
                          {svc.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              }
              return null
            })}
          </div>
        )}

        {(policyError || serverError) && (
          <p className="text-sm text-red-500">{policyError || serverError}</p>
        )}

        {/* 文件上传 */}
        <div>
          <p className="mb-1.5 text-sm font-medium text-gray-700">附件（可选）</p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-600 hover:border-primary-400 hover:text-primary-600 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
            选择文件
          </button>

          {files.length > 0 && (
            <ul className="mt-2 space-y-1.5">
              {files.map((f, i) => (
                <li key={i} className="flex items-center gap-2 rounded-md bg-gray-50 px-3 py-1.5 text-sm">
                  <svg className="h-4 w-4 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="flex-1 truncate text-gray-700">{f.name}</span>
                  <span className="flex-shrink-0 text-xs text-gray-400">{formatSize(f.size)}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="flex-shrink-0 text-gray-400 hover:text-red-500"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {uploadError && <p className="mt-1 text-xs text-red-500">{uploadError}</p>}
        </div>
      </div>
    </Modal>
  )
}
