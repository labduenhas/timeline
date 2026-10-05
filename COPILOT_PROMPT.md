# ACERVO TIMELINE — Full-Stack Web App Prompt for GitHub Copilot (Claude Sonnet)

## Project Identity
**App Name:** `acervo-timeline`  
**Stack:** Cloudflare Pages (frontend) + Cloudflare Workers (API) + D1 (SQLite) + R2 (file storage) + KV (metadata cache)  
**Constraint:** 100% Cloudflare Free Tier  
**Language:** TypeScript throughout  
**Framework:** React 18 + Vite (frontend) / Hono.js (Worker API)

---

## 🎯 Core Mission

Build a **document archive webapp** with a signature **horizontal/vertical timeline visualization**, capable of cataloging documents, images, PDFs, TXT files, videos (file upload + URL embed), and audio. The timeline view groups items by category/tag and renders them chronologically with hover microanimations, dynamic background transitions tied to the scroll position, and full document detail pages.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Cloudflare Pages (Static)                    │
│              React 18 + Vite + TypeScript + TailwindCSS         │
│  /           → Home (Timeline Explorer)                         │
│  /admin      → CRUD Dashboard (protected)                       │
│  /doc/:slug  → Document Detail Page                             │
│  /timeline   → Full Timeline View                               │
└──────────────────────┬──────────────────────────────────────────┘
                       │ fetch() to Worker API
┌──────────────────────▼──────────────────────────────────────────┐
│              Cloudflare Worker (Hono.js REST API)               │
│  GET  /api/docs          → list, filter, search, paginate       │
│  GET  /api/docs/:slug    → single document detail               │
│  POST /api/docs          → create document (admin)              │
│  PUT  /api/docs/:id      → update document (admin)              │
│  DEL  /api/docs/:id      → soft-delete document (admin)         │
│  POST /api/upload        → multipart upload → R2                │
│  GET  /api/categories    → list all categories/tags             │
│  GET  /api/timeline      → optimized timeline query             │
└──────┬──────────────────┬────────────────────────┬──────────────┘
       │                  │                        │
┌──────▼──────┐  ┌────────▼──────┐  ┌─────────────▼────────────┐
│ Cloudflare  │  │ Cloudflare D1 │  │  Cloudflare KV           │
│    R2       │  │  (SQLite DB)  │  │  (Cache layer)           │
│ Files/imgs  │  │  Documents,   │  │  Timeline JSON,          │
│ Thumbnails  │  │  Categories,  │  │  Category counts,        │
│ Videos      │  │  Tags, Media  │  │  Session tokens          │
└─────────────┘  └───────────────┘  └──────────────────────────┘
```

---

## 📐 D1 Database Schema

```sql
-- migrations/001_init.sql

CREATE TABLE IF NOT EXISTS documents (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  slug        TEXT UNIQUE NOT NULL,
  title       TEXT NOT NULL,
  subtitle    TEXT,
  description TEXT,
  body        TEXT,                        -- rich HTML content
  doc_date    TEXT NOT NULL,               -- ISO 8601: YYYY-MM-DD (or YYYY or YYYY-MM)
  date_precision TEXT DEFAULT 'day',       -- 'year' | 'month' | 'day'
  doc_type    TEXT NOT NULL,               -- 'image'|'pdf'|'txt'|'video_file'|'video_url'|'audio'|'document'|'link'
  source_url  TEXT,                        -- external URL (video embeds, web references)
  file_key    TEXT,                        -- R2 object key for uploaded files
  thumbnail_key TEXT,                      -- R2 object key for thumbnail
  cover_image_key TEXT,                    -- R2 object key for detail page cover
  author      TEXT,
  publisher   TEXT,
  location    TEXT,
  language    TEXT DEFAULT 'pt-BR',
  is_public   INTEGER DEFAULT 1,           -- 0 = draft, 1 = public
  is_featured INTEGER DEFAULT 0,
  view_count  INTEGER DEFAULT 0,
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now')),
  deleted_at  TEXT                         -- soft delete
);

CREATE TABLE IF NOT EXISTS categories (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  description TEXT,
  color       TEXT DEFAULT '#6366f1',      -- hex for UI theming
  icon        TEXT,                        -- emoji or lucide icon name
  parent_id   TEXT REFERENCES categories(id),
  sort_order  INTEGER DEFAULT 0,
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tags (
  id    TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name  TEXT NOT NULL,
  slug  TEXT UNIQUE NOT NULL,
  color TEXT DEFAULT '#94a3b8'
);

CREATE TABLE IF NOT EXISTS document_categories (
  document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
  category_id TEXT REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (document_id, category_id)
);

CREATE TABLE IF NOT EXISTS document_tags (
  document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
  tag_id      TEXT REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (document_id, tag_id)
);

CREATE TABLE IF NOT EXISTS document_media (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
  file_key    TEXT NOT NULL,
  media_type  TEXT NOT NULL,               -- 'image'|'pdf'|'audio'|'video'|'attachment'
  caption     TEXT,
  sort_order  INTEGER DEFAULT 0,
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS period_backgrounds (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  category_id TEXT REFERENCES categories(id),
  year_start  INTEGER NOT NULL,
  year_end    INTEGER NOT NULL,
  image_key   TEXT NOT NULL,               -- R2 key for background image
  description TEXT,
  opacity     REAL DEFAULT 0.35
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  token       TEXT PRIMARY KEY,
  expires_at  TEXT NOT NULL,
  created_at  TEXT DEFAULT (datetime('now'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_date     ON documents(doc_date);
CREATE INDEX IF NOT EXISTS idx_documents_public   ON documents(is_public, deleted_at);
CREATE INDEX IF NOT EXISTS idx_documents_type     ON documents(doc_type);
CREATE INDEX IF NOT EXISTS idx_doc_categories     ON document_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_doc_tags           ON document_tags(tag_id);
```

---

## 📁 Project File Structure

```
acervo-timeline/
├── wrangler.toml                          # Cloudflare config
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
├── migrations/
│   └── 001_init.sql
├── worker/
│   ├── index.ts                           # Hono app entrypoint
│   ├── lib/
│   │   ├── db.ts                          # D1 query helpers
│   │   ├── r2.ts                          # R2 upload/signed URL helpers
│   │   ├── kv.ts                          # KV cache helpers
│   │   ├── auth.ts                        # Simple token auth middleware
│   │   ├── slugify.ts                     # Slug generation utility
│   │   └── validators.ts                  # Zod schemas for request validation
│   └── routes/
│       ├── docs.ts
│       ├── timeline.ts
│       ├── categories.ts
│       ├── upload.ts
│       └── admin.ts
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── env.d.ts
    ├── types/
    │   └── index.ts                       # Shared TypeScript interfaces
    ├── lib/
    │   ├── api.ts                         # Typed fetch client
    │   └── utils.ts
    ├── hooks/
    │   ├── useTimeline.ts
    │   ├── useScrollProgress.ts
    │   └── useBackgroundTransition.ts
    ├── components/
    │   ├── ui/                            # Radix UI + shadcn primitives
    │   ├── layout/
    │   │   ├── Header.tsx
    │   │   └── Footer.tsx
    │   ├── timeline/
    │   │   ├── TimelineContainer.tsx      # Orchestrator
    │   │   ├── TimelineTrack.tsx          # Horizontal scroll rail
    │   │   ├── TimelineNode.tsx           # Individual document card
    │   │   ├── TimelineMarker.tsx         # Year/era markers
    │   │   ├── DocumentCard.tsx           # Hover card with microanim
    │   │   └── DocumentModal.tsx          # Quick preview modal
    │   ├── backgrounds/
    │   │   └── DynamicBackground.tsx      # Animated background layer
    │   ├── admin/
    │   │   ├── DocumentForm.tsx
    │   │   ├── CategoryManager.tsx
    │   │   ├── FileUploader.tsx
    │   │   └── DocumentTable.tsx
    │   └── document/
    │       ├── DocumentDetail.tsx
    │       ├── MediaViewer.tsx
    │       └── DownloadButton.tsx
    └── pages/
        ├── Home.tsx
        ├── TimelinePage.tsx
        ├── DocumentPage.tsx
        └── AdminPage.tsx
```

---

## ⚙️ wrangler.toml

```toml
name = "acervo-timeline"
main = "worker/index.ts"
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat"]
pages_build_output_dir = "./dist"

[[d1_databases]]
binding = "DB"
database_name = "acervo-db"
database_id = "REPLACE_WITH_ACTUAL_ID"

[[r2_buckets]]
binding = "BUCKET"
bucket_name = "acervo-files"

[[kv_namespaces]]
binding = "CACHE"
id = "REPLACE_WITH_ACTUAL_ID"

[vars]
ADMIN_SECRET = "REPLACE_WITH_SECURE_SECRET"
PUBLIC_R2_URL = "https://REPLACE.r2.dev"

[dev]
port = 8787
local_protocol = "http"
```

---

## 🔧 Worker API — Hono.js Implementation

### `worker/index.ts`
```typescript
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { timing } from 'hono/timing'
import { docsRouter } from './routes/docs'
import { timelineRouter } from './routes/timeline'
import { categoriesRouter } from './routes/categories'
import { uploadRouter } from './routes/upload'
import { adminRouter } from './routes/admin'

export type Env = {
  DB: D1Database
  BUCKET: R2Bucket
  CACHE: KVNamespace
  ADMIN_SECRET: string
  PUBLIC_R2_URL: string
}

const app = new Hono<{ Bindings: Env }>()

app.use('*', logger())
app.use('*', timing())
app.use('/api/*', cors({
  origin: ['http://localhost:5173', 'https://acervo-timeline.pages.dev'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

app.route('/api/docs', docsRouter)
app.route('/api/timeline', timelineRouter)
app.route('/api/categories', categoriesRouter)
app.route('/api/upload', uploadRouter)
app.route('/api/admin', adminRouter)

app.get('/api/health', (c) => c.json({ ok: true, ts: Date.now() }))
app.notFound((c) => c.json({ error: 'Not found' }, 404))
app.onError((err, c) => {
  console.error('[Worker Error]', err)
  return c.json({ error: 'Internal server error' }, 500)
})

export default app
```

### `worker/routes/timeline.ts`
```typescript
import { Hono } from 'hono'
import type { Env } from '../index'

export const timelineRouter = new Hono<{ Bindings: Env }>()

// GET /api/timeline?category=<slug>&tags=<slug,slug>&from=YYYY&to=YYYY
timelineRouter.get('/', async (c) => {
  const { category, tags, from, to } = c.req.query()
  const cacheKey = `timeline:${category || 'all'}:${tags || ''}:${from || ''}:${to || ''}`
  
  // Try KV cache first (5 min TTL)
  const cached = await c.env.CACHE.get(cacheKey, 'json')
  if (cached) return c.json(cached)

  let query = `
    SELECT 
      d.id, d.slug, d.title, d.subtitle, d.doc_date, d.date_precision,
      d.doc_type, d.thumbnail_key, d.author, d.location,
      d.description, d.source_url, d.is_featured,
      GROUP_CONCAT(DISTINCT c.slug) as category_slugs,
      GROUP_CONCAT(DISTINCT c.name) as category_names,
      GROUP_CONCAT(DISTINCT c.color) as category_colors,
      GROUP_CONCAT(DISTINCT t.name) as tag_names
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
  if (tags) {
    const tagList = tags.split(',').map(s => s.trim()).filter(Boolean)
    if (tagList.length > 0) {
      const placeholders = tagList.map(() => '?').join(', ')
      query += ` AND t.slug IN (${placeholders})`
      params.push(...tagList)
    }
  }

  query += ` GROUP BY d.id ORDER BY d.doc_date ASC`

  const result = await c.env.DB.prepare(query).bind(...params).all()
  
  const docs = (result.results || []).map((row: any) => ({
    ...row,
    thumbnail_url: row.thumbnail_key 
      ? `${c.env.PUBLIC_R2_URL}/${row.thumbnail_key}` 
      : null,
    categories: row.category_slugs 
      ? row.category_slugs.split(',').map((slug: string, i: number) => ({
          slug,
          name: row.category_names?.split(',')[i] || slug,
          color: row.category_colors?.split(',')[i] || '#6366f1',
        }))
      : [],
    tags: row.tag_names ? row.tag_names.split(',') : [],
  }))

  const response = { items: docs, total: docs.length, generated_at: Date.now() }
  
  // Cache for 5 minutes
  await c.env.CACHE.put(cacheKey, JSON.stringify(response), { expirationTtl: 300 })
  
  return c.json(response)
})
```

---

## 🎨 Frontend — Key React Components

### `src/hooks/useBackgroundTransition.ts`
```typescript
import { useState, useEffect, useRef, useCallback } from 'react'

interface BackgroundState {
  currentImage: string | null
  nextImage: string | null
  opacity: number
  period: { start: number; end: number; label: string } | null
}

export function useBackgroundTransition(
  scrollProgress: number,
  periodBackgrounds: Array<{
    year_start: number
    year_end: number
    image_url: string
    description: string
    opacity: number
  }>
) {
  const [bg, setBg] = useState<BackgroundState>({
    currentImage: null, nextImage: null, opacity: 0, period: null
  })
  const transitionRef = useRef<number | null>(null)

  const findPeriod = useCallback((progress: number) => {
    if (!periodBackgrounds.length) return null
    const index = Math.floor(progress * periodBackgrounds.length)
    return periodBackgrounds[Math.min(index, periodBackgrounds.length - 1)]
  }, [periodBackgrounds])

  useEffect(() => {
    const period = findPeriod(scrollProgress)
    if (!period) return
    
    const newImage = period.image_url
    if (newImage === bg.currentImage) return

    if (transitionRef.current) cancelAnimationFrame(transitionRef.current)

    setBg(prev => ({ ...prev, nextImage: newImage, opacity: 0 }))
    
    let start: number | null = null
    const duration = 1200 // ms

    function animate(ts: number) {
      if (!start) start = ts
      const progress = Math.min((ts - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
      
      setBg(prev => ({
        currentImage: progress >= 1 ? newImage : prev.currentImage,
        nextImage: progress >= 1 ? null : newImage,
        opacity: eased,
        period: period ? {
          start: period.year_start,
          end: period.year_end,
          label: period.description
        } : null
      }))

      if (progress < 1) {
        transitionRef.current = requestAnimationFrame(animate)
      }
    }
    transitionRef.current = requestAnimationFrame(animate)
    
    return () => {
      if (transitionRef.current) cancelAnimationFrame(transitionRef.current)
    }
  }, [scrollProgress, findPeriod])

  return bg
}
```

### `src/components/timeline/DocumentCard.tsx`
```tsx
import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface DocumentCardProps {
  doc: {
    id: string
    slug: string
    title: string
    subtitle?: string
    doc_date: string
    doc_type: string
    thumbnail_url?: string
    description?: string
    categories: Array<{ name: string; color: string }>
    tags: string[]
    author?: string
    location?: string
    is_featured: boolean
  }
  onSelect: (slug: string) => void
}

export function DocumentCard({ doc, onSelect }: DocumentCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  const typeIcon: Record<string, string> = {
    image: '🖼️', pdf: '📄', txt: '📝', video_file: '🎬',
    video_url: '▶️', audio: '🎵', document: '📋', link: '🔗',
  }

  return (
    <div
      ref={cardRef}
      className="relative flex-shrink-0 w-48 md:w-56 cursor-pointer select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
      tabIndex={0}
      role="button"
      aria-label={`Open document: ${doc.title}`}
      onKeyDown={(e) => e.key === 'Enter' && onSelect(doc.slug)}
    >
      {/* Timeline connector dot */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 flex flex-col items-center">
        <motion.div
          className="w-4 h-4 rounded-full border-2 border-white shadow-lg"
          style={{ backgroundColor: doc.categories[0]?.color || '#6366f1' }}
          animate={{ scale: isHovered ? 1.5 : 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        />
        <div className="w-0.5 h-4 bg-white/40" />
      </div>

      {/* Card */}
      <motion.div
        className="bg-black/70 backdrop-blur-md border border-white/20 rounded-xl overflow-hidden shadow-xl"
        animate={{
          y: isHovered ? -8 : 0,
          boxShadow: isHovered
            ? `0 20px 60px ${doc.categories[0]?.color || '#6366f1'}44`
            : '0 4px 20px rgba(0,0,0,0.5)',
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        onClick={() => onSelect(doc.slug)}
      >
        {/* Thumbnail */}
        <div className="relative h-32 bg-white/5 overflow-hidden">
          {doc.thumbnail_url ? (
            <motion.img
              src={doc.thumbnail_url}
              alt={doc.title}
              className="w-full h-full object-cover"
              animate={{ scale: isHovered ? 1.08 : 1 }}
              transition={{ duration: 0.4 }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl opacity-50">
              {typeIcon[doc.doc_type] || '📁'}
            </div>
          )}
          {doc.is_featured && (
            <div className="absolute top-2 right-2 text-xs bg-yellow-500 text-black px-1.5 py-0.5 rounded font-bold">
              ★
            </div>
          )}
          <div className="absolute bottom-2 left-2 text-xs bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded text-white/80">
            {typeIcon[doc.doc_type]} {doc.doc_type.replace('_', ' ')}
          </div>
        </div>

        {/* Info */}
        <div className="p-3">
          <div className="text-xs text-white/50 mb-1 font-mono">
            {doc.doc_date.substring(0, 4)}
          </div>
          <h3 className="text-sm font-semibold text-white leading-tight line-clamp-2 mb-1">
            {doc.title}
          </h3>
          {doc.author && (
            <p className="text-xs text-white/50 line-clamp-1">{doc.author}</p>
          )}
          {doc.categories.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {doc.categories.slice(0, 2).map(cat => (
                <span
                  key={cat.name}
                  className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                  style={{
                    backgroundColor: `${cat.color}33`,
                    color: cat.color,
                    border: `1px solid ${cat.color}66`,
                  }}
                >
                  {cat.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* Hover tooltip */}
      <AnimatePresence>
        {isHovered && doc.description && (
          <motion.div
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-20 z-50 w-64 bg-black/90 backdrop-blur-md border border-white/20 rounded-lg p-3 shadow-2xl pointer-events-none"
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            <p className="text-xs text-white/80 leading-relaxed line-clamp-4">
              {doc.description}
            </p>
            <p className="text-xs text-indigo-400 mt-2 font-medium">
              Click to explore →
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
```

### `src/components/backgrounds/DynamicBackground.tsx`
```tsx
import { useRef, useEffect } from 'react'

interface BackgroundState {
  currentImage: string | null
  nextImage: string | null
  opacity: number
  period: { start: number; end: number; label: string } | null
}

interface Props {
  state: BackgroundState
  className?: string
}

export function DynamicBackground({ state, className = '' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const gradient = ctx.createRadialGradient(
      canvas.width / 2, canvas.height / 2, 0,
      canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) / 1.5
    )
    gradient.addColorStop(0, 'rgba(0,0,0,0)')
    gradient.addColorStop(1, 'rgba(0,0,0,0.7)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }, [])

  return (
    <div className={`fixed inset-0 -z-10 overflow-hidden ${className}`}>
      <div className="absolute inset-0 bg-gray-950" />

      {state.currentImage && (
        <div
          className="absolute inset-0 bg-cover bg-center transition-none"
          style={{
            backgroundImage: `url(${state.currentImage})`,
            opacity: state.nextImage ? 1 - state.opacity : 1,
            filter: 'blur(2px) saturate(0.7)',
            transform: 'scale(1.05)',
          }}
        />
      )}

      {state.nextImage && (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${state.nextImage})`,
            opacity: state.opacity,
            filter: 'blur(2px) saturate(0.7)',
            transform: 'scale(1.05)',
          }}
        />
      )}

      <div className="absolute inset-0 bg-black/50" />
      <canvas ref={canvasRef} className="absolute inset-0 opacity-60 pointer-events-none" />

      {state.period && (
        <div
          className="absolute bottom-8 right-8 text-white/30 font-mono text-sm pointer-events-none"
          style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}
        >
          {state.period.label}
        </div>
      )}
    </div>
  )
}
```

---

## 📦 package.json Dependencies

```json
{
  "name": "acervo-timeline",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "worker:dev": "wrangler dev",
    "worker:deploy": "wrangler deploy",
    "pages:deploy": "wrangler pages deploy dist",
    "db:migrate": "wrangler d1 execute acervo-db --file=./migrations/001_init.sql",
    "db:migrate:local": "wrangler d1 execute acervo-db --local --file=./migrations/001_init.sql",
    "lint": "eslint . --ext ts,tsx",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "hono": "^4.5.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.26.0",
    "framer-motion": "^11.3.0",
    "@radix-ui/react-dialog": "^1.1.0",
    "@radix-ui/react-select": "^2.1.0",
    "@radix-ui/react-tooltip": "^1.1.0",
    "lucide-react": "^0.424.0",
    "zod": "^3.23.0",
    "date-fns": "^3.6.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.4.0"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20240919.0",
    "wrangler": "^3.70.0",
    "vite": "^5.4.0",
    "@vitejs/plugin-react": "^4.3.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "typescript": "^5.5.0",
    "eslint": "^9.9.0"
  }
}
```

---

## 🚀 Implementation Tasks for Copilot

Complete these tasks **in order**. Each task must be fully implemented before moving to the next. Do not leave TODOs or placeholder code.

### PHASE 1 — Scaffold & Config
1. Initialize project with `npm create vite@latest acervo-timeline -- --template react-ts`
2. Install all dependencies listed above
3. Create `wrangler.toml` with the exact configuration shown
4. Create `migrations/001_init.sql` with all tables and indexes as defined
5. Configure `tailwind.config.ts` with dark theme defaults (`darkMode: 'class'`, dark background base)
6. Configure `vite.config.ts` with proxy for `/api` → `http://localhost:8787` in dev

### PHASE 2 — Worker API
7. Implement `worker/lib/db.ts` with typed D1 helper functions
8. Implement `worker/lib/r2.ts` with upload (multipart, max 100MB per CF free limit), presigned GET URLs, and thumbnail generation via Cloudflare Images API or sharp-wasm fallback
9. Implement `worker/lib/auth.ts` — Bearer token middleware checking `ADMIN_SECRET` env var
10. Implement `worker/lib/validators.ts` — Zod schemas for all document creation/update payloads
11. Implement all 5 route files (`docs.ts`, `timeline.ts`, `categories.ts`, `upload.ts`, `admin.ts`)
12. Implement `worker/index.ts` main Hono app with all routes mounted

### PHASE 3 — Core React Infrastructure
13. Create `src/types/index.ts` with TypeScript interfaces matching DB schema exactly
14. Create `src/lib/api.ts` — typed fetch client with error handling and retry logic (3 retries, exponential backoff)
15. Create all hooks: `useTimeline`, `useScrollProgress`, `useBackgroundTransition`
16. Set up React Router in `App.tsx` with 4 routes: `/`, `/timeline`, `/doc/:slug`, `/admin`

### PHASE 4 — Timeline View
17. Implement `TimelineContainer.tsx` — fetches data, manages filter state, passes scroll progress to background hook
18. Implement `TimelineTrack.tsx` — horizontal scrolling rail on desktop (`overflow-x: scroll`, `scroll-snap-type: x proximity`), vertical on mobile; uses `useScrollProgress` to track position
19. Implement `TimelineMarker.tsx` — decade/year markers with styled dividers
20. Implement `DocumentCard.tsx` — exact implementation as shown above with all microanimations
21. Implement `DynamicBackground.tsx` — exact implementation as shown above
22. Implement filter bar: category multi-select, tag pills, date range slider

### PHASE 5 — Document Detail Page
23. Implement `DocumentDetail.tsx` — full page with: cover image, title/meta header, rich body HTML renderer, media gallery grid, download buttons for all attached files, embed player for videos (YouTube/Vimeo iframe or native `<video>` for R2 files), related documents section
24. Implement `MediaViewer.tsx` — lightbox for images, PDF viewer using `<iframe>` or `<embed>`, audio player with waveform visualization via Web Audio API

### PHASE 6 — Admin Dashboard
25. Implement admin login page with secret token form
26. Implement `DocumentForm.tsx` — full CRUD form with: all document fields, multi-file upload with progress bars, category/tag multi-select with create-inline capability, date picker with precision selector (year/month/day), rich text editor (use `<textarea>` with basic markdown support, render to HTML on save)
27. Implement `DocumentTable.tsx` — sortable, filterable data table with bulk actions (publish, unpublish, delete)
28. Implement `CategoryManager.tsx` — category/tag CRUD with color picker and hierarchy support

### PHASE 7 — Polish & Performance
29. Add `<Suspense>` boundaries with skeleton loading UI for all async components
30. Implement image lazy loading with `loading="lazy"` and `IntersectionObserver` for timeline cards
31. Add `prefers-reduced-motion` media query to disable microanimations when requested
32. Add ARIA labels and keyboard navigation to timeline (left/right arrow keys to navigate cards)
33. Implement `robots.txt` and basic OpenGraph meta tags in document detail pages
34. Add error boundary components wrapping all major page sections

---

## 🔒 Security Requirements

- Admin routes MUST require `Authorization: Bearer <ADMIN_SECRET>` header
- File upload MUST validate MIME types server-side (allowlist: `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `application/pdf`, `text/plain`, `video/mp4`, `video/webm`, `audio/mpeg`, `audio/ogg`)  
- File upload MUST enforce 100MB size limit (Cloudflare free tier max)
- SQL queries MUST use parameterized statements only — no string interpolation
- R2 files MUST use opaque keys (UUID-based), never expose original filenames in keys
- Soft-delete pattern: never `DELETE` documents, set `deleted_at` timestamp instead

---

## 🎨 Design Tokens (Tailwind + CSS Variables)

```css
/* src/index.css */
:root {
  --color-bg: #030712;
  --color-surface: #111827;
  --color-surface-2: #1f2937;
  --color-border: rgba(255,255,255,0.1);
  --color-text: #f9fafb;
  --color-text-muted: #9ca3af;
  --color-accent: #6366f1;
  --timeline-height: 2px;
  --card-width-desktop: 224px;
  --card-width-mobile: 160px;
}
```

---

## 🧪 Error Resilience Checklist

Every component and API route MUST handle:
- [ ] Network failure → show retry button, never blank screen
- [ ] Empty state → show meaningful empty state UI with call-to-action
- [ ] Image load failure → show type icon fallback, never broken image icon
- [ ] D1 query timeout → return cached KV data if available, else 503 with `Retry-After: 30` header
- [ ] R2 object not found → return 404 JSON with `{ error: 'File not found', fallback_url: '/placeholder.svg' }`
- [ ] Worker CPU limit (10ms free tier) → paginate all queries, max 50 items per request, use streaming where possible
- [ ] KV cache miss → gracefully fall through to D1 query, log miss for monitoring
- [ ] Invalid date format in `doc_date` → normalize in DB layer, store as YYYY-MM-DD, fallback to '0001-01-01' if unparseable
- [ ] Missing thumbnail → render SVG placeholder with document type icon inline
- [ ] Admin auth failure → return 401 JSON, never 500
- [ ] File type not in allowlist → return 415 Unsupported Media Type with list of allowed types
- [ ] R2 upload failure → return 502 with retry instructions

---

## 📋 Cloudflare Free Tier Constraints

| Resource | Free Limit | Strategy in This App |
|---|---|---|
| Workers requests | 100K/day | KV cache all timeline queries (5 min TTL) |
| D1 reads | 5M/month | Index all filter columns, paginate to 50 items |
| D1 writes | 100K/month | Batch admin operations, write-through cache |
| R2 storage | 10 GB | Store compressed WebP thumbnails + originals |
| R2 Class A ops | 1M/month | Only write on upload and update events |
| R2 Class B ops | 10M/month | Cache signed URLs in KV for 1 hour |
| KV reads | 100K/day | Cache timeline, category list, period backgrounds |
| KV storage | 1 GB | Store serialized JSON only, expire all keys |
| Pages builds | 500/month | Single deploy per push to main branch |
| Pages file count | 20K files | Keep dist lean, no unnecessary assets |

---

## ✅ Definition of Done

The implementation is complete when ALL of the following are true:

1. `npm run dev` starts frontend on :5173 and worker on :8787 simultaneously without errors
2. Admin can create a document with all field types and successfully upload a file to R2
3. Timeline page renders documents horizontally on desktop and vertically on mobile, with year markers
4. Background image transitions smoothly (cross-fade, 1.2s ease-out cubic) as user scrolls
5. Hovering a card triggers lift animation, tooltip, and thumbnail zoom within 16ms
6. Clicking a card navigates to document detail page with all media rendered correctly
7. All API endpoints return correct HTTP status codes (200, 201, 400, 401, 404, 415, 500, 503)
8. All filter combinations (category + tag + date range + search) return correct, deduplicated results
9. `wrangler pages deploy dist` deploys to Cloudflare Pages without errors
10. `wrangler deploy` deploys Worker to Cloudflare Workers without errors
11. `npm run type-check` passes with **zero** TypeScript errors
12. All error states (network down, empty results, image fail) show graceful UI, never blank or crashed screen
