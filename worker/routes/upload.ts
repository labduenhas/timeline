import { Hono } from 'hono'
import type { Env } from '../index'
import { authMiddleware } from '../lib/auth'
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE, generateFileKey, getPublicUrl, isAllowedMimeType } from '../lib/r2'

export const uploadRouter = new Hono<{ Bindings: Env }>()

// POST /api/upload (Admin Multipart Upload to R2)
uploadRouter.post('/', authMiddleware, async (c) => {
  try {
    const formData = await c.req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return c.json({ error: 'Nenhum arquivo enviado' }, 400)
    }

    // Validate MIME type
    if (!isAllowedMimeType(file.type)) {
      return c.json({
        error: 'Tipo de arquivo não permitido',
        allowed_types: ALLOWED_MIME_TYPES,
      }, 415)
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return c.json({
        error: `Arquivo excede o limite máximo permitido de ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
      }, 400)
    }

    const fileKey = generateFileKey(file.name)
    const arrayBuffer = await file.arrayBuffer()

    // Upload to R2
    if (c.env.BUCKET) {
      await c.env.BUCKET.put(fileKey, arrayBuffer, {
        httpMetadata: {
          contentType: file.type,
        },
        customMetadata: {
          originalName: encodeURIComponent(file.name),
          uploadedAt: new Date().toISOString(),
        },
      })
    } else {
      console.warn('[R2 Warning] BUCKET binding not present (local dev without R2 emulation)')
    }

    const publicUrl = getPublicUrl(fileKey, c.env.PUBLIC_R2_URL)

    return c.json({
      ok: true,
      file_key: fileKey,
      public_url: publicUrl,
      filename: file.name,
      size: file.size,
      mime_type: file.type,
    }, 201)
  } catch (error) {
    console.error('[POST /api/upload error]', error)
    return c.json({ error: 'Falha ao processar upload do arquivo', details: String(error) }, 502)
  }
})
