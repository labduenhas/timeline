import { Hono } from 'hono'
import type { Env } from '../index'
import { authMiddleware } from '../lib/auth'
import { slugify } from '../lib/slugify'
import { CreateCategorySchema, CreateTagSchema } from '../lib/validators'

export const categoriesRouter = new Hono<{ Bindings: Env }>()

// GET /api/categories (List all categories and tags)
categoriesRouter.get('/', async (c) => {
  try {
    const categoriesRes = await c.env.DB.prepare(`
      SELECT c.*, COUNT(dc.document_id) as doc_count
      FROM categories c
      LEFT JOIN document_categories dc ON c.id = dc.category_id
      LEFT JOIN documents d ON dc.document_id = d.id AND d.is_public = 1 AND d.deleted_at IS NULL
      GROUP BY c.id
      ORDER BY c.sort_order ASC, c.name ASC
    `).all()

    const tagsRes = await c.env.DB.prepare(`
      SELECT t.*, COUNT(dt.document_id) as doc_count
      FROM tags t
      LEFT JOIN document_tags dt ON t.id = dt.tag_id
      LEFT JOIN documents d ON dt.document_id = d.id AND d.is_public = 1 AND d.deleted_at IS NULL
      GROUP BY t.id
      ORDER BY t.name ASC
    `).all()

    return c.json({
      categories: categoriesRes.results || [],
      tags: tagsRes.results || [],
    })
  } catch (error) {
    console.error('[GET /api/categories error]', error)
    return c.json({ error: 'Erro ao listar categorias' }, 500)
  }
})

// POST /api/categories (Create category - Admin)
categoriesRouter.post('/', authMiddleware, async (c) => {
  try {
    const body = await c.req.json()
    const parsed = CreateCategorySchema.safeParse(body)
    if (!parsed.success) {
      return c.json({ error: 'Dados inválidos', details: parsed.error.format() }, 400)
    }

    const data = parsed.data
    const id = 'cat_' + crypto.randomUUID().substring(0, 8)
    const slug = data.slug ? slugify(data.slug) : slugify(data.name)

    await c.env.DB.prepare(`
      INSERT INTO categories (id, name, slug, description, color, icon, parent_id, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, data.name, slug, data.description || null,
      data.color || '#6366f1', data.icon || null,
      data.parent_id || null, data.sort_order || 0
    ).run()

    return c.json({ ok: true, id, slug }, 201)
  } catch (error) {
    console.error('[POST /api/categories error]', error)
    return c.json({ error: 'Erro ao criar categoria' }, 500)
  }
})

// POST /api/categories/tags (Create tag - Admin)
categoriesRouter.post('/tags', authMiddleware, async (c) => {
  try {
    const body = await c.req.json()
    const parsed = CreateTagSchema.safeParse(body)
    if (!parsed.success) {
      return c.json({ error: 'Dados inválidos', details: parsed.error.format() }, 400)
    }

    const data = parsed.data
    const id = 'tag_' + crypto.randomUUID().substring(0, 8)
    const slug = data.slug ? slugify(data.slug) : slugify(data.name)

    await c.env.DB.prepare(`
      INSERT INTO tags (id, name, slug, color) VALUES (?, ?, ?, ?)
    `).bind(id, data.name, slug, data.color || '#94a3b8').run()

    return c.json({ ok: true, id, slug }, 201)
  } catch (error) {
    console.error('[POST /api/categories/tags error]', error)
    return c.json({ error: 'Erro ao criar tag' }, 500)
  }
})
