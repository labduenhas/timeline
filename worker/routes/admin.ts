import { Hono } from 'hono'
import type { Env } from '../index'
import {
  adminSecret,
  attemptsExceeded,
  authMiddleware,
  clearAttempts,
  clientAddress,
  passwordsMatch,
  recordFailedAttempt,
  signSession,
} from '../lib/auth'

export const adminRouter = new Hono<{ Bindings: Env }>()

adminRouter.post('/verify', async (c) => {
  const secret = adminSecret(c.env)
  if (!secret) {
    return c.json({ error: 'O painel administrativo não está disponível.' }, 503)
  }

  const address = clientAddress(c)
  if (await attemptsExceeded(c.env, address)) {
    return c.json({ error: 'Muitas tentativas. Aguarde alguns minutos.' }, 429)
  }

  const body = await c.req.json<{ secret?: string; website?: string }>().catch(() => null)
  const provided = body?.secret || ''
  const honeypot = body?.website?.trim() || ''
  if (honeypot || !(await passwordsMatch(provided, secret))) {
    await recordFailedAttempt(c.env, address)
    return c.json({ error: 'Chave de administração inválida' }, 401)
  }

  await clearAttempts(c.env, address)
  const session = await signSession(secret)
  return c.json({ ok: true, token: session.token, expires_at: session.expires_at })
})

// GET /api/admin/stats (Protected)
adminRouter.get('/stats', authMiddleware, async (c) => {
  try {
    const docsCount = await c.env.DB.prepare(
      `SELECT COUNT(*) as count FROM documents WHERE deleted_at IS NULL`
    ).first<{ count: number }>()

    const viewsCount = await c.env.DB.prepare(
      `SELECT SUM(view_count) as total_views FROM documents WHERE deleted_at IS NULL`
    ).first<{ total_views: number }>()

    const categoriesCount = await c.env.DB.prepare(
      `SELECT COUNT(*) as count FROM categories`
    ).first<{ count: number }>()

    const tagsCount = await c.env.DB.prepare(
      `SELECT COUNT(*) as count FROM tags`
    ).first<{ count: number }>()

    const recentDocs = await c.env.DB.prepare(`
      SELECT id, slug, title, doc_date, doc_type, is_public, view_count, created_at
      FROM documents
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 5
    `).all()

    return c.json({
      total_documents: docsCount?.count || 0,
      total_views: viewsCount?.total_views || 0,
      total_categories: categoriesCount?.count || 0,
      total_tags: tagsCount?.count || 0,
      recent_documents: recentDocs.results || [],
    })
  } catch (error) {
    console.error('[GET /api/admin/stats error]', error)
    return c.json({ error: 'Erro ao carregar estatísticas' }, 500)
  }
})
