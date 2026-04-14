import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { HTTPException } from 'hono/http-exception'
import { v4 as uuidv4 } from 'uuid'
import { requirePortalAuth } from '../middleware/auth'
import { toCamelList } from '../../shared/db'

export const resourcesRoutes = new Hono<{ Bindings: Env }>()

resourcesRoutes.use('*', requirePortalAuth)

// GET /api/client/resources
resourcesRoutes.get('/', async (c) => {
  const { clientId } = c.get('portalPayload')
  const results = await c.env.DB.prepare(
    'SELECT id, resource_type, title, description, external_url, uploaded_at FROM client_resources WHERE client_id = ? ORDER BY uploaded_at DESC',
  ).bind(clientId).all()
  return c.json({ data: toCamelList(results.results as Record<string, unknown>[]) })
})

// POST /api/client/upload/get-presigned-url - 获取 R2 预签名上传 URL
resourcesRoutes.post(
  '/upload-url',
  zValidator('json', z.object({
    fileName: z.string().min(1),
    contentType: z.string().min(1),
    title: z.string().min(1),
    resourceType: z.enum(['MedicalReport', 'Contract', 'PassportCopy', 'PartnerContact']),
  })),
  async (c) => {
    const { clientId } = c.get('portalPayload')
    const { fileName, contentType, title, resourceType } = c.req.valid('json')

    const fileId = uuidv4()
    const key = `client-docs/${clientId}/${fileId}-${fileName}`

    // 创建 R2 多段上传（用于获取上传凭证）
    const mpu = await c.env.STORAGE.createMultipartUpload(key, {
      httpMetadata: { contentType },
    })

    // 在 D1 中预记录资源（上传完成后前端通知确认）
    const resourceId = uuidv4()
    await c.env.DB.prepare(
      `INSERT INTO client_resources (id, client_id, resource_type, title, r2_object_key)
       VALUES (?, ?, ?, ?, ?)`,
    ).bind(resourceId, clientId, resourceType, title, key).run()

    return c.json({
      data: {
        resourceId,
        key,
        uploadId: mpu.uploadId,
        contentType,
      },
    })
  },
)

// GET /api/client/resources/:id/download-url - 获取预签名下载 URL
resourcesRoutes.get('/:id/download-url', async (c) => {
  const { clientId } = c.get('portalPayload')
  const resourceId = c.req.param('id')

  const resource = await c.env.DB.prepare(
    'SELECT * FROM client_resources WHERE id = ? AND client_id = ?',
  ).bind(resourceId, clientId).first<{ r2_object_key: string | null; external_url: string | null }>()

  if (!resource) throw new HTTPException(404, { message: '资源不存在' })

  if (resource.external_url) {
    return c.json({ data: { url: resource.external_url } })
  }

  if (!resource.r2_object_key) throw new HTTPException(400, { message: '资源无下载链接' })

  // 生成有效期 1 小时的预签名 URL
  const signedUrl = await c.env.STORAGE.get(resource.r2_object_key)
  if (!signedUrl) throw new HTTPException(404, { message: '文件不存在' })

  // R2 不直接支持预签名 URL，通过 Workers 代理下载
  return new Response(signedUrl.body, {
    headers: {
      'Content-Type': signedUrl.httpMetadata?.contentType ?? 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${resource.r2_object_key.split('/').pop()}"`,
    },
  })
})
