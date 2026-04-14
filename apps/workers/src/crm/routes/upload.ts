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

