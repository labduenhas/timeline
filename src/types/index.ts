export type DocType =
  | 'image'
  | 'pdf'
  | 'txt'
  | 'video_file'
  | 'video_url'
  | 'audio'
  | 'document'
  | 'link'

export type DatePrecision = 'year' | 'month' | 'day'

export interface Category {
  id: string
  name: string
  slug: string
  description?: string | null
  color: string
  icon?: string | null
  parent_id?: string | null
  sort_order: number
  doc_count?: number
}

export interface Tag {
  id: string
  name: string
  slug: string
  color: string
  doc_count?: number
}

export interface DocumentItem {
  id: string
  slug: string
  title: string
  subtitle?: string | null
  description?: string | null
  body?: string | null
  doc_date: string
  date_precision: DatePrecision
  doc_type: DocType
  source_url?: string | null
  thumbnail_url?: string | null
  cover_image_url?: string | null
  file_url?: string | null
  author?: string | null
  publisher?: string | null
  location?: string | null
  language?: string
  is_public: boolean
  is_featured: boolean
  view_count: number
  created_at?: string
  categories: Array<{ slug: string; name: string; color: string }>
  tags: string[]
}

export interface DocumentMedia {
  id: string
  media_type: 'image' | 'pdf' | 'audio' | 'video' | 'attachment'
  caption?: string | null
  url: string | null
}

export interface DocumentDetail extends Omit<DocumentItem, 'categories' | 'tags'> {
  categories: Category[]
  tags: Tag[]
  media: DocumentMedia[]
  related: Array<{
    id: string
    slug: string
    title: string
    doc_date: string
    doc_type: DocType
    thumbnail_url: string | null
  }>
}

export interface PeriodBackground {
  id: string
  year_start: number
  year_end: number
  image_url: string
  description: string
  opacity: number
}

export interface TimelineResponse {
  items: DocumentItem[]
  total: number
  period_backgrounds: PeriodBackground[]
  generated_at: number
}

export interface SitePage {
  id: string
  slug: string
  title: string
  body?: string
  is_visible: boolean
  sort_order: number
  updated_at?: string | null
}

export interface SiteSettings {
  site_title: string
  site_subtitle: string
  logo_url: string
  logo_invert: string
  footer_about: string
  footer_copyright: string
  footer_credit: string
  footer_nav_label: string
  footer_institutional_label: string
}

export interface AdminStats {
  total_documents: number
  total_views: number
  total_categories: number
  total_tags: number
  recent_documents: Array<{
    id: string
    slug: string
    title: string
    doc_date: string
    doc_type: DocType
    is_public: number
    view_count: number
    created_at: string
  }>
}
