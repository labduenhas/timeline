-- migrations/001_init.sql

CREATE TABLE IF NOT EXISTS documents (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  slug        TEXT UNIQUE NOT NULL,
  title       TEXT NOT NULL,
  subtitle    TEXT,
  description TEXT,
  body        TEXT,                        -- rich HTML/markdown content
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
  image_key   TEXT NOT NULL,               -- R2 key or URL for background image
  description TEXT,
  opacity     REAL DEFAULT 0.35
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  token       TEXT PRIMARY KEY,
  expires_at  TEXT NOT NULL,
  created_at  TEXT DEFAULT (datetime('now'))
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_documents_date     ON documents(doc_date);
CREATE INDEX IF NOT EXISTS idx_documents_public   ON documents(is_public, deleted_at);
CREATE INDEX IF NOT EXISTS idx_documents_type     ON documents(doc_type);
CREATE INDEX IF NOT EXISTS idx_doc_categories     ON document_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_doc_tags           ON document_tags(tag_id);
