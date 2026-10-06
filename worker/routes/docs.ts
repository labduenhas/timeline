import { Hono } from 'hono'
import type { Env } from '../index'
import { authMiddleware } from '../lib/auth'
import { getPublicUrl } from '../lib/r2'
import { likeContains } from '../lib/like'
import { slugify } from '../lib/slugify'
import { CreateDocumentSchema, UpdateDocumentSchema } from '../lib/validators'

export const docsRouter = new Hono<{ Bindings: Env }>()

// GET /api/docs (Paginated & Filtered)
docsRouter.get('/', async (c) => {
  try {
    const page = Math.max(1, parseInt(c.req.query('page') || '1', 10))
    const limit = Math.min(50, Math.max(1, parseInt(c.req.query('limit') || '20', 10)))
    const offset = (page - 1) * limit
    const search = c.req.query('search')
    const category = c.req.query('category')
    const tag = c.req.query('tag')
    const docType = c.req.query('type')

    let whereClause = `WHERE d.is_public = 1 AND d.deleted_at IS NULL`
    const params: (string | number)[] = []

    if (search) {
      whereClause += ` AND (d.title LIKE ? ESCAPE '\\' OR d.description LIKE ? ESCAPE '\\' OR d.author LIKE ? ESCAPE '\\' OR substr(d.doc_date, 1, 4) LIKE ? ESCAPE '\\')`
      const term = likeContains(search)
      params.push(term, term, term, term)
    }
    if (category) {
      whereClause += ` AND EXISTS (SELECT 1 FROM document_categories dc JOIN categories c ON dc.category_id = c.id WHERE dc.document_id = d.id AND c.slug = ?)`
      params.push(category)
    }
    if (tag) {
      whereClause += ` AND EXISTS (SELECT 1 FROM document_tags dt JOIN tags t ON dt.tag_id = t.id WHERE dt.document_id = d.id AND t.slug = ?)`
      params.push(tag)
    }
    if (docType) {
      whereClause += ` AND d.doc_type = ?`
      params.push(docType)
    }

    // Count total
    const countSql = `SELECT COUNT(DISTINCT d.id) as total FROM documents d ${whereClause}`
    const countRes = await c.env.DB.prepare(countSql).bind(...params).first<{ total: number }>()
    const total = countRes?.total || 0

    // Query items
    const query = `
      SELECT 
        d.id, d.slug, d.title, d.subtitle, d.description, d.doc_date, d.date_precision,
        d.doc_type, d.thumbnail_key, d.cover_image_key, d.author, d.publisher, d.location,
        d.is_featured, d.view_count, d.created_at,
        GROUP_CONCAT(DISTINCT c.name) as category_names,
        GROUP_CONCAT(DISTINCT c.slug) as category_slugs,
        GROUP_CONCAT(DISTINCT c.color) as category_colors,
        GROUP_CONCAT(DISTINCT t.name) as tag_names
      FROM documents d
      LEFT JOIN document_categories dc ON d.id = dc.document_id
      LEFT JOIN categories c ON dc.category_id = c.id
      LEFT JOIN document_tags dt ON d.id = dt.document_id
      LEFT JOIN tags t ON dt.tag_id = t.id
      ${whereClause}
      GROUP BY d.id
      ORDER BY d.doc_date DESC
      LIMIT ? OFFSET ?
    `
    const listParams = [...params, limit, offset]
    const result = await c.env.DB.prepare(query).bind(...listParams).all()

    const items = (result.results || []).map((row: any) => {
      const catSlugs = row.category_slugs ? row.category_slugs.split(',') : []
      const catNames = row.category_names ? row.category_names.split(',') : []
      const catColors = row.category_colors ? row.category_colors.split(',') : []

      return {
        id: row.id,
        slug: row.slug,
        title: row.title,
        subtitle: row.subtitle,
        description: row.description,
        doc_date: row.doc_date,
        date_precision: row.date_precision,
        doc_type: row.doc_type,
        author: row.author,
        publisher: row.publisher,
        location: row.location,
        is_featured: Boolean(row.is_featured),
        view_count: row.view_count || 0,
        thumbnail_url: getPublicUrl(row.thumbnail_key, c.env.PUBLIC_R2_URL),
        cover_image_url: getPublicUrl(row.cover_image_key, c.env.PUBLIC_R2_URL),
        categories: catSlugs.map((slug: string, i: number) => ({
          slug,
          name: catNames[i] || slug,
          color: catColors[i] || '#6366f1',
        })),
        tags: row.tag_names ? row.tag_names.split(',') : [],
      }
    })

    return c.json({
      items,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('[GET /api/docs error]', error)
    return c.json({ error: 'Erro ao buscar documentos' }, 500)
  }
})

// GET /api/docs/:slug (Detail)
docsRouter.get('/:slug', async (c) => {
  try {
    const slug = c.req.param('slug')
    const doc = await c.env.DB.prepare(`
      SELECT * FROM documents WHERE slug = ? AND deleted_at IS NULL
    `).bind(slug).first<any>()

    if (!doc) {
      return c.json({ error: 'Documento não encontrado' }, 404)
    }

    // Increment view count asynchronously
    c.executionCtx?.waitUntil(
      c.env.DB.prepare(`UPDATE documents SET view_count = view_count + 1 WHERE id = ?`).bind(doc.id).run()
    )

    // Fetch categories
    const categoriesRes = await c.env.DB.prepare(`
      SELECT c.* FROM categories c
      JOIN document_categories dc ON c.id = dc.category_id
      WHERE dc.document_id = ?
    `).bind(doc.id).all()

    // Fetch tags
    const tagsRes = await c.env.DB.prepare(`
      SELECT t.* FROM tags t
      JOIN document_tags dt ON t.id = dt.tag_id
      WHERE dt.document_id = ?
    `).bind(doc.id).all()

    // Fetch media attachments
    const mediaRes = await c.env.DB.prepare(`
      SELECT * FROM document_media WHERE document_id = ? ORDER BY sort_order ASC
    `).bind(doc.id).all()

    const media = (mediaRes.results || []).map((m: any) => ({
      id: m.id,
      media_type: m.media_type,
      caption: m.caption,
      url: getPublicUrl(m.file_key, c.env.PUBLIC_R2_URL),
    }))

    // Fetch related documents (same category or nearby date)
    const relatedRes = await c.env.DB.prepare(`
      SELECT d.id, d.slug, d.title, d.thumbnail_key, d.doc_date, d.doc_type
      FROM documents d
      WHERE d.id != ? AND d.is_public = 1 AND d.deleted_at IS NULL
      ORDER BY RANDOM() LIMIT 4
    `).bind(doc.id).all()

    const related = (relatedRes.results || []).map((r: any) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      doc_date: r.doc_date,
      doc_type: r.doc_type,
      thumbnail_url: getPublicUrl(r.thumbnail_key, c.env.PUBLIC_R2_URL),
    }))

    return c.json({
      ...doc,
      is_featured: Boolean(doc.is_featured),
      is_public: Boolean(doc.is_public),
      thumbnail_url: getPublicUrl(doc.thumbnail_key, c.env.PUBLIC_R2_URL),
      cover_image_url: getPublicUrl(doc.cover_image_key, c.env.PUBLIC_R2_URL),
      file_url: getPublicUrl(doc.file_key, c.env.PUBLIC_R2_URL),
      categories: categoriesRes.results || [],
      tags: tagsRes.results || [],
      media,
      related,
    })
  } catch (error) {
    console.error('[GET /api/docs/:slug error]', error)
    return c.json({ error: 'Erro ao buscar detalhes do documento' }, 500)
  }
})

// POST /api/docs (Admin Create)
docsRouter.post('/', authMiddleware, async (c) => {
  try {
    const body = await c.req.json()
    const parsed = CreateDocumentSchema.safeParse(body)
    if (!parsed.success) {
      return c.json({ error: 'Dados inválidos', details: parsed.error.format() }, 400)
    }

    const data = parsed.data
    const id = crypto.randomUUID().replace(/-/g, '')
    const slug = data.slug ? slugify(data.slug) : slugify(data.title) + '-' + id.substring(0, 6)

    // Check slug collision
    const existing = await c.env.DB.prepare(`SELECT id FROM documents WHERE slug = ?`).bind(slug).first()
    const finalSlug = existing ? `${slug}-${id.substring(0, 4)}` : slug

    await c.env.DB.prepare(`
      INSERT INTO documents (
        id, slug, title, subtitle, description, body, doc_date, date_precision,
        doc_type, source_url, file_key, thumbnail_key, cover_image_key,
        author, publisher, location, language, is_public, is_featured
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, finalSlug, data.title, data.subtitle || null, data.description || null, data.body || null,
      data.doc_date, data.date_precision, data.doc_type, data.source_url || null,
      data.file_key || null, data.thumbnail_key || null, data.cover_image_key || null,
      data.author || null, data.publisher || null, data.location || null, data.language,
      data.is_public, data.is_featured
    ).run()

    // Assign categories
    if (data.categories?.length) {
      for (const catId of data.categories) {
        await c.env.DB.prepare(`
          INSERT OR IGNORE INTO document_categories (document_id, category_id) VALUES (?, ?)
        `).bind(id, catId).run()
      }
    }

    // Invalidate timeline cache
    if (c.env.CACHE) {
      const list = await c.env.CACHE.list({ prefix: 'timeline:' })
      for (const key of list.keys) {
        await c.env.CACHE.delete(key.name)
      }
    }

    return c.json({ ok: true, id, slug: finalSlug }, 201)
  } catch (error) {
    console.error('[POST /api/docs error]', error)
    return c.json({ error: 'Erro ao criar documento' }, 500)
  }
})

// PUT /api/docs/:id (Admin Update)
docsRouter.put('/:id', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()
    const parsed = UpdateDocumentSchema.safeParse(body)
    if (!parsed.success) {
      return c.json({ error: 'Dados inválidos', details: parsed.error.format() }, 400)
    }

    const doc = await c.env.DB.prepare(`SELECT id FROM documents WHERE id = ? AND deleted_at IS NULL`).bind(id).first()
    if (!doc) {
      return c.json({ error: 'Documento não encontrado' }, 404)
    }

    const d = parsed.data
    await c.env.DB.prepare(`
      UPDATE documents SET
        title = COALESCE(?, title),
        subtitle = COALESCE(?, subtitle),
        description = COALESCE(?, description),
        body = COALESCE(?, body),
        doc_date = COALESCE(?, doc_date),
        date_precision = COALESCE(?, date_precision),
        doc_type = COALESCE(?, doc_type),
        source_url = COALESCE(?, source_url),
        file_key = COALESCE(?, file_key),
        thumbnail_key = COALESCE(?, thumbnail_key),
        cover_image_key = COALESCE(?, cover_image_key),
        author = COALESCE(?, author),
        publisher = COALESCE(?, publisher),
        location = COALESCE(?, location),
        is_public = COALESCE(?, is_public),
        is_featured = COALESCE(?, is_featured),
        updated_at = datetime('now')
      WHERE id = ?
    `).bind(
      d.title ?? null, d.subtitle ?? null, d.description ?? null, d.body ?? null,
      d.doc_date ?? null, d.date_precision ?? null, d.doc_type ?? null, d.source_url ?? null,
      d.file_key ?? null, d.thumbnail_key ?? null, d.cover_image_key ?? null,
      d.author ?? null, d.publisher ?? null, d.location ?? null,
      d.is_public ?? null, d.is_featured ?? null,
      id
    ).run()

    // Update categories if supplied
    if (d.categories) {
      await c.env.DB.prepare(`DELETE FROM document_categories WHERE document_id = ?`).bind(id).run()
      for (const catId of d.categories) {
        await c.env.DB.prepare(`
          INSERT OR IGNORE INTO document_categories (document_id, category_id) VALUES (?, ?)
        `).bind(id, catId).run()
      }
    }

    // Invalidate timeline cache
    if (c.env.CACHE) {
      const list = await c.env.CACHE.list({ prefix: 'timeline:' })
      for (const key of list.keys) {
        await c.env.CACHE.delete(key.name)
      }
    }

    return c.json({ ok: true, message: 'Documento atualizado com sucesso' })
  } catch (error) {
    console.error('[PUT /api/docs/:id error]', error)
    return c.json({ error: 'Erro ao atualizar documento' }, 500)
  }
})

// DELETE /api/docs/:id (Admin Soft Delete)
docsRouter.delete('/:id', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id')
    const result = await c.env.DB.prepare(`
      UPDATE documents SET deleted_at = datetime('now') WHERE id = ? AND deleted_at IS NULL
    `).bind(id).run()

    if (!result.meta.changes) {
      return c.json({ error: 'Documento não encontrado ou já removido' }, 404)
    }

    // Invalidate timeline cache
    if (c.env.CACHE) {
      const list = await c.env.CACHE.list({ prefix: 'timeline:' })
      for (const key of list.keys) {
        await c.env.CACHE.delete(key.name)
      }
    }

    return c.json({ ok: true, message: 'Documento removido com sucesso' })
  } catch (error) {
    console.error('[DELETE /api/docs/:id error]', error)
    return c.json({ error: 'Erro ao remover documento' }, 500)
  }
})
