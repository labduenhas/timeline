import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { timing } from 'hono/timing'
import type { D1Database, R2Bucket, KVNamespace } from '@cloudflare/workers-types'
import { docsRouter } from './routes/docs'
import { timelineRouter } from './routes/timeline'
import { categoriesRouter } from './routes/categories'
import { uploadRouter } from './routes/upload'
import { adminRouter } from './routes/admin'

export type Env = {
  DB: D1Database
  BUCKET?: R2Bucket
  CACHE?: KVNamespace
  ADMIN_SECRET?: string
  PUBLIC_R2_URL?: string
}

const app = new Hono<{ Bindings: Env }>()

// Global Middlewares
app.use('*', logger())
app.use('*', timing())
app.use(
  '/api/*',
  cors({
    origin: (origin) => origin || '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  })
)

// API Sub-routers
app.route('/api/docs', docsRouter)
app.route('/api/timeline', timelineRouter)
app.route('/api/categories', categoriesRouter)
app.route('/api/upload', uploadRouter)
app.route('/api/admin', adminRouter)

// Health check endpoint
app.get('/api/health', (c) => c.json({ ok: true, timestamp: Date.now(), service: 'acervo-timeline-worker' }))

// 404 Not Found Handler
app.notFound((c) => {
  return c.json({ error: 'Recurso não encontrado' }, 404)
})

// Error Boundary Handler
app.onError((err, c) => {
  console.error('[Worker Unhandled Error]:', err)
  return c.json({ error: 'Erro interno no servidor' }, 500)
})

export default app
