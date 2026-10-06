import { Hono } from 'hono'
import type { Env } from '../index'
import { getPublicUrl } from '../lib/r2'
import { likeContains } from '../lib/like'
import type { PeriodBackgroundRow } from '../lib/db'

export const timelineRouter = new Hono<{ Bindings: Env }>()

// GET /api/timeline?category=<slug>&tags=<slug,slug>&from=YYYY&to=YYYY&search=<term>
timelineRouter.get('/', async (c) => {
  try {
    const { category, tags, from, to, search } = c.req.query()
    const cacheKey = `timeline:${category || 'all'}:${tags || ''}:${from || ''}:${to || ''}:${search || ''}`

    // 1. Check KV cache
    if (c.env.CACHE) {
      try {
        const cached = await c.env.CACHE.get(cacheKey, 'json')
        if (cached) return c.json(cached)
      } catch (e) {
        console.warn('[Timeline KV read error]', e)
      }
    }

    // 2. Query Documents
    let query = `
      SELECT 
        d.id, d.slug, d.title, d.subtitle, d.doc_date, d.date_precision,
        d.doc_type, d.thumbnail_key, d.author, d.location,
        d.description, d.source_url, d.is_featured, d.view_count,
        GROUP_CONCAT(DISTINCT c.slug) as category_slugs,
        GROUP_CONCAT(DISTINCT c.name) as category_names,
        GROUP_CONCAT(DISTINCT c.color) as category_colors,
        GROUP_CONCAT(DISTINCT t.name) as tag_names,
        GROUP_CONCAT(DISTINCT t.slug) as tag_slugs
      FROM documents d
      LEFT JOIN document_categories dc ON d.id = dc.document_id
      LEFT JOIN categories c ON dc.category_id = c.id
      LEFT JOIN document_tags dt ON d.id = dt.document_id
      LEFT JOIN tags t ON dt.tag_id = t.id
      WHERE d.is_public = 1 AND d.deleted_at IS NULL
    `
    const params: (string | number)[] = []

    if (category) {
      query += ` AND c.slug = ?`
      params.push(category)
    }
    if (from) {
      query += ` AND d.doc_date >= ?`
      params.push(`${from}-01-01`)
    }
    if (to) {
      query += ` AND d.doc_date <= ?`
      params.push(`${to}-12-31`)
    }
    if (search) {
      query += ` AND (d.title LIKE ? ESCAPE '\\' OR d.description LIKE ? ESCAPE '\\' OR d.author LIKE ? ESCAPE '\\' OR substr(d.doc_date, 1, 4) LIKE ? ESCAPE '\\')`
      const term = likeContains(search)
      params.push(term, term, term, term)
    }
    if (tags) {
      const tagList = tags.split(',').map((s) => s.trim()).filter(Boolean)
      if (tagList.length > 0) {
        const placeholders = tagList.map(() => '?').join(', ')
        query += ` AND t.slug IN (${placeholders})`
        params.push(...tagList)
      }
    }

    query += ` GROUP BY d.id ORDER BY d.doc_date ASC`

    const result = await c.env.DB.prepare(query).bind(...params).all()

    const docs = (result.results || []).map((row: any) => {
      const catSlugs = row.category_slugs ? row.category_slugs.split(',') : []
      const catNames = row.category_names ? row.category_names.split(',') : []
      const catColors = row.category_colors ? row.category_colors.split(',') : []

      const categories = catSlugs.map((slug: string, i: number) => ({
        slug,
        name: catNames[i] || slug,
        color: catColors[i] || '#6366f1',
      }))

      return {
        id: row.id,
        slug: row.slug,
        title: row.title,
        subtitle: row.subtitle,
        description: row.description,
        doc_date: row.doc_date,
        date_precision: row.date_precision,
        doc_type: row.doc_type,
        source_url: row.source_url,
        author: row.author,
        location: row.location,
        is_featured: Boolean(row.is_featured),
        view_count: row.view_count || 0,
        thumbnail_url: getPublicUrl(row.thumbnail_key, c.env.PUBLIC_R2_URL),
        categories,
        tags: row.tag_names ? row.tag_names.split(',') : [],
      }
    })

    // 3. Query Period Backgrounds
    const bgResult = await c.env.DB.prepare(`
      SELECT pb.*, c.name as category_name
      FROM period_backgrounds pb
      LEFT JOIN categories c ON pb.category_id = c.id
      ORDER BY pb.year_start ASC
    `).all<PeriodBackgroundRow>()

    const periodBackgrounds = (bgResult.results || []).map((bg) => ({
      id: bg.id,
      year_start: bg.year_start,
      year_end: bg.year_end,
      image_url: getPublicUrl(bg.image_key, c.env.PUBLIC_R2_URL) || bg.image_key,
      description: bg.description || '',
      opacity: bg.opacity,
    }))

    const response = {
      items: docs,
      total: docs.length,
      period_backgrounds: periodBackgrounds,
      generated_at: Date.now(),
    }

    // Cache in KV for 5 minutes (300 seconds)
    if (c.env.CACHE) {
      try {
        await c.env.CACHE.put(cacheKey, JSON.stringify(response), { expirationTtl: 300 })
      } catch (e) {
        console.warn('[Timeline KV put error]', e)
      }
    }

    return c.json(response)
  } catch (error) {
    console.error('[Timeline API Error]', error)
    return c.json({ error: 'Erro ao carregar linha do tempo' }, 500)
  }
})
