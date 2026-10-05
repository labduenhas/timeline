import type { D1Database } from '@cloudflare/workers-types'

export interface DocumentRow {
  id: string
  slug: string
  title: string
  subtitle: string | null
  description: string | null
  body: string | null
  doc_date: string
  date_precision: 'year' | 'month' | 'day'
  doc_type: string
  source_url: string | null
  file_key: string | null
  thumbnail_key: string | null
  cover_image_key: string | null
  author: string | null
  publisher: string | null
  location: string | null
  language: string
  is_public: number
  is_featured: number
  view_count: number
  created_at: string
  updated_at: string
  deleted_at: string | null
  category_slugs?: string
  category_names?: string
  category_colors?: string
  tag_names?: string
  tag_slugs?: string
}

export interface CategoryRow {
  id: string
  name: string
  slug: string
  description: string | null
  color: string
  icon: string | null
  parent_id: string | null
  sort_order: number
  created_at: string
  doc_count?: number
}

export interface TagRow {
  id: string
  name: string
  slug: string
  color: string
}

export interface PeriodBackgroundRow {
  id: string
  category_id: string | null
  year_start: number
  year_end: number
  image_key: string
  description: string | null
  opacity: number
}
