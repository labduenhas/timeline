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

export function mergeSettings(raw?: Partial<SiteSettings> | Record<string, string> | null): SiteSettings {
  const next = { ...DEFAULT_SETTINGS }
  if (!raw) return next
  ;(Object.keys(next) as Array<keyof SiteSettings>).forEach((key) => {
    if (raw[key] != null) next[key] = String(raw[key])
  })
  return next
}
