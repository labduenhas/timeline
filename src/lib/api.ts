import type {
  TimelineResponse,
  DocumentDetail,
  DocumentItem,
  Category,
  Tag,
  AdminStats,
  SitePage,
  SiteSettings,
} from '@/types'

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '')

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function fetchWithRetry<T>(
  url: string,
  options: RequestInit = {},
  retries = 3,
  delayMs = 300
): Promise<T> {
  const token = localStorage.getItem('acervo_admin_token')
  const headers = new Headers(options.headers || {})

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const mergedOptions: RequestInit = {
    ...options,
    headers,
  }

  try {
    const res = await fetch(url, mergedOptions)

    if (!res.ok) {
      let errorMsg = `Erro ${res.status}: ${res.statusText}`
      let details: any = null
      try {
        const json = (await res.json()) as any
        errorMsg = json.error || errorMsg
        details = json.details || null
      } catch {
        // ignore parse error
      }

      // Retry on 500, 502, 503, 504
      if (retries > 0 && res.status >= 500 && res.status <= 504) {
        await new Promise((r) => setTimeout(r, delayMs))
        return fetchWithRetry<T>(url, options, retries - 1, delayMs * 2)
      }

      throw new ApiError(res.status, errorMsg, details)
    }

    return (await res.json()) as T
  } catch (err: any) {
    if (err instanceof ApiError) throw err
    if (retries > 0) {
      await new Promise((r) => setTimeout(r, delayMs))
      return fetchWithRetry<T>(url, options, retries - 1, delayMs * 2)
    }
    throw new ApiError(0, err.message || 'Falha de conexão com o servidor')
  }
}

export const api = {
  // Timeline
  getTimeline: (params?: {
    category?: string
    tags?: string
    from?: string
    to?: string
    search?: string
  }) => {
    const q = new URLSearchParams()
    if (params?.category) q.set('category', params.category)
    if (params?.tags) q.set('tags', params.tags)
    if (params?.from) q.set('from', params.from)
    if (params?.to) q.set('to', params.to)
    if (params?.search) q.set('search', params.search)
    return fetchWithRetry<TimelineResponse>(`${API_BASE}/timeline?${q.toString()}`)
  },

  // Documents
  getDocuments: (params?: {
    page?: number
    limit?: number
    search?: string
    category?: string
    tag?: string
    type?: string
  }) => {
    const q = new URLSearchParams()
    if (params?.page) q.set('page', params.page.toString())
    if (params?.limit) q.set('limit', params.limit.toString())
    if (params?.search) q.set('search', params.search)
    if (params?.category) q.set('category', params.category)
    if (params?.tag) q.set('tag', params.tag)
    if (params?.type) q.set('type', params.type)
    return fetchWithRetry<{
      items: DocumentItem[]
      total: number
      page: number
      limit: number
      total_pages: number
    }>(`${API_BASE}/docs?${q.toString()}`)
  },

  getDocumentBySlug: (slug: string) => {
    return fetchWithRetry<DocumentDetail>(`${API_BASE}/docs/${slug}`)
  },

  createDocument: (data: any) => {
    return fetchWithRetry<{ ok: boolean; id: string; slug: string }>(`${API_BASE}/docs`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  updateDocument: (id: string, data: any) => {
    return fetchWithRetry<{ ok: boolean; message: string }>(`${API_BASE}/docs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  deleteDocument: (id: string) => {
    return fetchWithRetry<{ ok: boolean; message: string }>(`${API_BASE}/docs/${id}`, {
      method: 'DELETE',
    })
  },

  // Categories & Tags
  getCategories: () => {
    return fetchWithRetry<{ categories: Category[]; tags: Tag[] }>(`${API_BASE}/categories`)
  },

  createCategory: (data: Partial<Category>) => {
    return fetchWithRetry<{ ok: boolean; id: string; slug: string }>(`${API_BASE}/categories`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  createTag: (data: Partial<Tag>) => {
    return fetchWithRetry<{ ok: boolean; id: string; slug: string }>(`${API_BASE}/categories/tags`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // Upload
  uploadFile: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return fetchWithRetry<{
      ok: boolean
      file_key: string
      public_url: string
      filename: string
      size: number
      mime_type: string
    }>(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData,
    })
  },

  // Admin
  verifySecret: (secret: string, website = '') => {
    return fetchWithRetry<{ ok: boolean; valid?: boolean; token?: string; expires_at?: number }>(`${API_BASE}/admin/verify`, {
      method: 'POST',
      body: JSON.stringify({ secret, website }),
    })
  },

  getAdminStats: () => {
    return fetchWithRetry<AdminStats>(`${API_BASE}/admin/stats`)
  },

  getPages: (all = false) => {
    const q = all ? '?all=1' : ''
    return fetchWithRetry<{ items: SitePage[] }>(`${API_BASE}/pages${q}`)
  },

  getPage: (slug: string) => {
    return fetchWithRetry<SitePage>(`${API_BASE}/pages/${encodeURIComponent(slug)}`)
  },

  createPage: (data: Partial<SitePage>) => {
    return fetchWithRetry<{ ok: boolean; id: string; slug: string }>(`${API_BASE}/pages`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  updatePage: (id: string, data: Partial<SitePage>) => {
    return fetchWithRetry<{ ok: boolean; id: string; slug: string }>(`${API_BASE}/pages/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  deletePage: (id: string) => {
    return fetchWithRetry<{ ok: boolean }>(`${API_BASE}/pages/${id}`, {
      method: 'DELETE',
    })
  },

  getSettings: () => {
    return fetchWithRetry<{ settings: SiteSettings }>(`${API_BASE}/settings`)
  },

  updateSettings: (settings: Partial<SiteSettings>) => {
    return fetchWithRetry<{ ok: boolean; settings: SiteSettings }>(`${API_BASE}/settings`, {
      method: 'PUT',
      body: JSON.stringify({ settings }),
    })
  },
}
