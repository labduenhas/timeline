import type { SitePage, SiteSettings } from '@/types'

export const DEFAULT_SETTINGS: SiteSettings = {
  site_title: 'Acervo Timeline',
  site_subtitle: 'Preservação da Memória & História',
  logo_url: '',
  logo_invert: '1',
  footer_about:
    'Arquivo digital aberto dedicado à documentação, catalogação crítica e conservação preventiva do patrimônio histórico, artístico e cultural.',
  footer_copyright: 'Acervo Timeline & Preservação da Memória.',
  footer_credit: 'Acesso público para pesquisa e patrimônio cultural.',
  footer_nav_label: 'Navegação',
  footer_institutional_label: 'Institucional',
  footer_image_url: '/footer-band.webp',
  hero_images: '[]',
  hero_interval: '8',
  hero_kenburns: '0',
  home_badge: 'Arquivo Aberto',
  home_eyebrow: 'Catálogo crítico de obras',
  home_title: 'Explore por período e movimento',
  home_lead:
    'Marcos, iconografias fundadoras e documentos raros do patrimônio visual e político, estruturados em linha contínua do tempo.',
  home_search_placeholder: 'Buscar por título, autor ou ano...',
  explore_badge: 'Catálogo',
  explore_title: 'Explorar acervo histórico',
  explore_lead: 'Pesquise registros, documentos oficiais, imagens e mídias digitalizadas.',
  explore_search_placeholder: 'Buscar por palavras-chave, eventos ou personalidades...',
}

export const DEFAULT_PAGES: SitePage[] = [
  {
    id: 'page_missao',
    slug: 'missao-metodologia',
    title: 'Missão & Metodologia',
    is_visible: true,
    sort_order: 10,
  },
  {
    id: 'page_catalogo',
    slug: 'catalogo-publico',
    title: 'Catálogo público',
    is_visible: true,
    sort_order: 20,
  },
]

export const DEFAULT_FOOTER_IMAGE = '/footer-band.webp'

export function parseHeroImages(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.map((item) => String(item).trim()).filter(Boolean)
  } catch {
    return []
  }
}

export function clampHeroInterval(raw: string): number {
  const value = Number(raw)
  if (!Number.isFinite(value)) return 8
  return Math.min(60, Math.max(3, Math.round(value)))
}

export function mergeSettings(raw?: Partial<SiteSettings> | Record<string, string> | null): SiteSettings {
  const next = { ...DEFAULT_SETTINGS }
  if (!raw) return next
  ;(Object.keys(next) as Array<keyof SiteSettings>).forEach((key) => {
    if (raw[key] != null) next[key] = String(raw[key])
  })
  return next
}
