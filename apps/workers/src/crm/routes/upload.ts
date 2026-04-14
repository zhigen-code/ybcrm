import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { requireAuth } from '../middleware/auth'

export const uploadRoutes = new Hono<{ Bindings: Env }>()

uploadRoutes.use('*', requireAuth)

// POST /api/upload/internal - 内部文件上传（直接写入 R2）
uploadRoutes.post('/internal', async (c) => {
  const formData = await c.req.formData()
  const file = formData.get('file') as File | null
  if (!file) return c.json({ message: '未提供文件' }, 400)

  const key = `internal-docs/${uuidv4()}-${file.name}`
  await c.env.STORAGE.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
  })

  return c.json({ data: { key, name: file.name, size: file.size } }, 201)
})

// GET /api/upload/file?key=xxx - 内部文件下载（流式代理）
uploadRoutes.get(
  '/file',
  zValidator('query', z.object({ key: z.string().min(1) })),
  async (c) => {
    const { key } = c.req.valid('query')
    const obj = await c.env.STORAGE.get(key)
    if (!obj) return c.json({ message: '文件不存在' }, 404)
    const fileName = key.split('/').pop() ?? 'file'
    return new Response(obj.body as ReadableStream, {
      headers: {
        'Content-Type': obj.httpMetadata?.contentType ?? 'application/octet-stream',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      },
    })
  },
)

