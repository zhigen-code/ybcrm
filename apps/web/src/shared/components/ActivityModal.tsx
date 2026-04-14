import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { crmApi } from '@/shared/utils/request'
import { Modal } from './Modal'
import { Button } from './Button'
import { Select } from './Select'
import { Textarea } from './Textarea'
import { Input } from './Input'
import { useOptionGroup, toSelectOptions } from '@/shared/hooks/useOptions'
import type { ActivityAttachment } from '@/shared/types'

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
}

interface ActivityModalProps {
  title: string
  onClose: () => void
  onSubmit: (data: ActivitySubmitData) => void
  loading: boolean
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function ActivityModal({ title, onClose, onSubmit, loading }: ActivityModalProps) {
  const { options: activityTypeOpts } = useOptionGroup('activity_type')
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      activityType: activityTypeOpts[0]?.value ?? '',
      activityDate: new Date().toISOString().slice(0, 16),
    },
  })

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return
    setFiles((prev) => [...prev, ...Array.from(incoming)])
    setUploadError('')
  }

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleSave = handleSubmit(async (formData) => {
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

    onSubmit({ ...formData, attachmentKeys })
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
        <Select
          label="跟进类型"
          options={toSelectOptions(activityTypeOpts)}
          {...register('activityType')}
        />
        <Textarea
          label="内容"
          placeholder="记录本次跟进的要点..."
          {...register('description')}
        />
        <Input
          type="datetime-local"
          label="时间"
          error={errors.activityDate?.message}
          {...register('activityDate')}
        />

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
