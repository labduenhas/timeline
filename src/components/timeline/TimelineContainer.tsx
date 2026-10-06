import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AlertCircle, ArrowLeft, ArrowRight, FolderArchive, RefreshCw, Search, X } from 'lucide-react'
import { useTimeline } from '@/hooks/useTimeline'
import { api } from '@/lib/api'
import { FilterBar } from './FilterBar'
import { TimelineTrack, scrollTimelineBy, scrollTimelineToRange } from './TimelineTrack'
import { DocumentModal } from './DocumentModal'
import { Skeleton } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import type { DocumentItem, PeriodBackground, Tag } from '@/types'

function eraLabel(period: PeriodBackground) {
  const short = period.description.split('(')[0].trim()
  return `${period.year_start} • ${short}`
}

function matchesDocumentYear(docDate: string, term: string) {
  return docDate.slice(0, 4).includes(term)
}

export function TimelineContainer() {
  const location = useLocation()
  const trackRef = useRef<HTMLDivElement>(null)

  const [category, setCategory] = useState<string | undefined>()
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [quickDoc, setQuickDoc] = useState<DocumentItem | null>(null)
  const [activeIndex, setActiveIndex] = useState(1)
  const [activeEra, setActiveEra] = useState<number | null>(null)
  const [catalogTotal, setCatalogTotal] = useState<number | null>(null)
  const [catalogItems, setCatalogItems] = useState<DocumentItem[]>([])
  const [catalogFeatured, setCatalogFeatured] = useState<DocumentItem[]>([])
  const [tags, setTags] = useState<Tag[]>([])

  const { items, periodBackgrounds, total, loading, error, refetch } = useTimeline({
    category,
    search,
  })

  const hero = catalogFeatured[0]
  const side = catalogFeatured.slice(1, 3)

  const handleActiveIndex = useCallback((index: number) => {
    setActiveIndex(index)
  }, [])

  useEffect(() => {
    api.getCategories().then((res) => setTags(res.tags || [])).catch(console.error)
    api.getTimeline().then((res) => {
      const docs = res.items || []
      setCatalogTotal(res.total)
      setCatalogItems(docs)
      setCatalogFeatured(docs.filter((item) => item.is_featured))
    }).catch(console.error)
  }, [])

  useEffect(() => {
    const handle = window.setTimeout(() => setSearch(query.trim()), 280)
    return () => window.clearTimeout(handle)
  }, [query])

  useEffect(() => {
    const id = location.hash.replace('#', '')
    if (!id) return
    const timer = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
    return () => window.clearTimeout(timer)
  }, [location.hash, loading])

  const visibleItems = useMemo(() => {
    const term = search.trim()
    if (!/^\d{2,4}$/.test(term)) return items
    const seen = new Set(items.map((item) => item.id))
    const byYear = catalogItems.filter((item) => {
      if (seen.has(item.id) || !matchesDocumentYear(item.doc_date, term)) return false
      if (category && !(item.categories || []).some((entry) => entry.slug === category)) return false
      return true
    })
    if (byYear.length === 0) return items
    return [...items, ...byYear].sort((a, b) => a.doc_date.localeCompare(b.doc_date))
  }, [items, catalogItems, search, category])

  useEffect(() => {
    const current = visibleItems[activeIndex - 1]
    if (!current?.doc_date) {
      setActiveEra(null)
      return
    }
    const year = Number(current.doc_date.substring(0, 4))
    const match = periodBackgrounds.find((period) => year >= period.year_start && year <= period.year_end)
    setActiveEra(match ? match.year_start : null)
  }, [activeIndex, visibleItems, periodBackgrounds])

  const applySearch = (value: string) => {
    setQuery(value)
    setSearch(value)
  }

  return (
    <div className="flex flex-col w-full text-on-surface">
      <section className="max-w-[1440px] mx-auto w-full px-4 sm:px-8 lg:px-margin-desktop pt-8 pb-6">
        <div className="max-w-3xl pb-8">
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-terracotta text-white text-label-sm uppercase tracking-widest">
              Arquivo Aberto
            </span>
            <span className="text-label-sm uppercase tracking-widest text-outline">
              Catálogo crítico de obras
            </span>
          </div>
          <h1 className="font-display text-4xl sm:text-display-xl text-primary font-normal tracking-tight leading-[1.08]">
            Explore por período e movimento
          </h1>
          <p className="text-body-lg text-on-surface-variant mt-4 max-w-2xl">
            Marcos, iconografias fundadoras e documentos raros do patrimônio visual e político, estruturados em linha contínua do tempo.
          </p>
        </div>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <form
          id="pesquisa"
          className="w-full max-w-2xl min-w-0 scroll-mt-28"
          onSubmit={(e) => {
            e.preventDefault()
            setSearch(query.trim())
          }}
        >
          <label htmlFor="pesquisa-campo" className="sr-only">Pesquisar no acervo</label>
          <div className="relative flex items-center bg-surface-container-lowest rounded-full border border-outline-variant/70 shadow-sm">
            <Search className="absolute left-4 w-4 h-4 text-outline pointer-events-none" />
            <input
              id="pesquisa-campo"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full py-3 pl-11 pr-12 bg-transparent text-on-surface placeholder:text-outline text-body-md focus:outline-none"
              placeholder="Buscar por título, autor ou ano..."
              type="text"
              autoComplete="off"
            />
            {query && (
              <button
                type="button"
                aria-label="Limpar busca"
                onClick={() => applySearch('')}
                className="absolute right-3 w-8 h-8 rounded-full text-outline hover:text-on-surface hover:bg-surface-container flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </form>
          <div className="flex items-center gap-4 shrink-0 self-end md:self-center">
            <div className="flex items-center gap-1 bg-surface-container px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-terracotta animate-pulse" />
              <span className="text-label-sm tracking-wider uppercase pl-1 text-on-surface-variant">
                Modo Exposição
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Anterior na linha do tempo"
                onClick={() => scrollTimelineBy(trackRef.current, -1)}
                className="w-11 h-11 rounded-full bg-surface-container-high hover:bg-primary hover:text-on-primary text-on-surface flex items-center justify-center transition-all duration-200"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                aria-label="Próximo na linha do tempo"
                onClick={() => scrollTimelineBy(trackRef.current, 1)}
                className="w-11 h-11 rounded-full bg-surface-container-high hover:bg-primary hover:text-on-primary text-on-surface flex items-center justify-center transition-all duration-200"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 text-body-sm text-on-surface-variant">
            <span className="text-outline">Termos frequentes</span>
            {tags.slice(0, 4).map((tag) => (
              <button
                key={tag.id}
                type="button"
                className="hover:text-primary underline underline-offset-4"
                onClick={() => applySearch(tag.name)}
              >
                {tag.name}
              </button>
            ))}
          </div>
        )}
        <div className="mt-5">
          <FilterBar category={category} onCategoryChange={setCategory} />
        </div>
      </section>

      {periodBackgrounds.length > 0 && (
        <div className="w-full bg-surface-container-low py-3">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-margin-desktop flex items-center justify-between gap-6">
            <div className="flex items-center gap-4 sm:gap-8 text-on-surface-variant text-label-sm uppercase tracking-widest overflow-x-auto no-scrollbar">
              {periodBackgrounds.map((period, index) => (
                <span key={period.id} className="flex items-center gap-4 sm:gap-8 shrink-0">
                  {index > 0 && <span className="text-outline-variant font-light">—</span>}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveEra(period.year_start)
                      scrollTimelineToRange(trackRef.current, period.year_start, period.year_end)
                    }}
                    className={cn(
                      'whitespace-nowrap transition-colors hover:text-primary',
                      activeEra === period.year_start ? 'text-primary font-semibold' : ''
                    )}
                  >
                    {eraLabel(period)}
                  </button>
                </span>
              ))}
            </div>
            <div className="hidden lg:flex items-center gap-3 shrink-0">
              <span className="text-label-md text-primary font-medium tracking-tight">
                {visibleItems.length === 0 ? '0 itens' : `${activeIndex} de ${visibleItems.length} itens`}
              </span>
            </div>
          </div>
        </div>
      )}

      {loading && visibleItems.length === 0 && !error ? (
        <div className="w-full px-4 sm:px-8 lg:px-margin-desktop py-10 flex gap-8 overflow-x-hidden">
          {[1, 2, 3].map((i) => (
            <div key={i} className="w-[340px] sm:w-[410px] flex-shrink-0 space-y-3">
              <Skeleton className="aspect-[4/5] w-full rounded-xl" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-5 w-full" />
            </div>
          ))}
        </div>
      ) : error && visibleItems.length === 0 ? (
        <div className="max-w-md mx-auto my-12 p-6 rounded-2xl bg-surface-container-lowest border border-rose-200 text-center space-y-4 shadow-sm">
          <AlertCircle className="w-12 h-12 text-rose-700 mx-auto" />
          <h3 className="text-lg font-display text-primary">Falha ao carregar o acervo</h3>
          <p className="text-sm text-on-surface-variant">{error}</p>
          <Button variant="primary" onClick={refetch} className="mx-auto">
            <RefreshCw className="w-4 h-4 mr-2" /> Tentar novamente
          </Button>
        </div>
      ) : visibleItems.length === 0 ? (
        <div className="max-w-md mx-auto my-16 p-8 rounded-3xl bg-surface-container-lowest border border-outline-variant text-center space-y-4">
          <FolderArchive className="w-8 h-8 mx-auto text-outline" />
          <h3 className="text-xl font-display text-primary">Nenhum documento encontrado</h3>
          <p className="text-sm text-on-surface-variant">
            Não encontramos registros para os filtros selecionados.
          </p>
          <Button
            variant="secondary"
            onClick={() => {
              setCategory(undefined)
              applySearch('')
            }}
            className="mx-auto"
          >
            Redefinir filtros
          </Button>
        </div>
      ) : (
        <TimelineTrack
          items={visibleItems}
          containerRef={trackRef}
          onQuickViewDoc={setQuickDoc}
          onActiveIndexChange={handleActiveIndex}
        />
      )}

      {catalogFeatured.length > 0 && (
        <section className="max-w-[1440px] mx-auto w-full px-4 sm:px-8 lg:px-margin-desktop py-16">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pb-8">
            <div>
              <h2 className="font-display text-3xl sm:text-display-xl text-primary font-normal tracking-tight">
                Destaques do Acervo Permanente
              </h2>
              <p className="text-body-md text-on-surface-variant mt-2">
                Peças marcadas para estudo e consulta direta no catálogo.
              </p>
            </div>
            <Link
              to="/timeline"
              className="inline-flex items-center gap-2 text-label-md font-semibold text-terracotta hover:text-[#5c2a16] transition-colors"
            >
              Ver todas as {catalogTotal ?? total} obras
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            {hero && (
              <Link to={`/doc/${hero.slug}`} className="md:col-span-7 flex flex-col group">
                <div className="relative w-full aspect-[16/10] overflow-hidden rounded-xl bg-surface-container">
                  {hero.thumbnail_url ? (
                    <img
                      src={hero.thumbnail_url}
                      alt={hero.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="w-full h-full bg-primary-container" />
                  )}
                  <div className="absolute bottom-4 left-4 bg-primary/80 backdrop-blur-md px-3 py-1 rounded text-on-primary text-label-sm">
                    {hero.categories?.[0]?.name || 'Destaque'}
                  </div>
                </div>
                <div className="pt-4">
                  <h3 className="font-display text-headline-sm text-primary font-medium group-hover:text-terracotta transition-colors">
                    {hero.title}
                  </h3>
                  {hero.subtitle && (
                    <p className="text-body-md text-on-surface-variant italic mt-1 font-display">{hero.subtitle}</p>
                  )}
                </div>
              </Link>
            )}
            {side.length > 0 && (
              <div className="md:col-span-5 flex flex-col gap-8">
                {side.map((item) => (
                  <Link key={item.id} to={`/doc/${item.slug}`} className="flex flex-col group">
                    <div className="relative w-full aspect-[16/9] overflow-hidden rounded-xl bg-surface-container">
                      {item.thumbnail_url ? (
                        <img
                          src={item.thumbnail_url}
                          alt={item.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                        />
                      ) : (
                        <div className="w-full h-full bg-primary-container" />
                      )}
                      <div className="absolute bottom-4 left-4 bg-primary/80 backdrop-blur-md px-3 py-1 rounded text-on-primary text-label-sm">
                        {item.categories?.[0]?.name || 'Destaque'}
                      </div>
                    </div>
                    <div className="pt-3">
                      <h4 className="font-semibold text-on-surface group-hover:text-terracotta transition-colors">
                        {item.title}
                      </h4>
                      <p className="text-body-sm text-outline mt-0.5">
                        {item.doc_date?.substring(0, 4)}
                        {item.author ? ` • ${item.author}` : ''}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      <DocumentModal
        doc={quickDoc}
        onClose={() => setQuickDoc(null)}
        onPrevious={
          quickDoc && visibleItems.findIndex((item) => item.id === quickDoc.id) > 0
            ? () => {
                const index = visibleItems.findIndex((item) => item.id === quickDoc.id)
                setQuickDoc(visibleItems[index - 1])
              }
            : undefined
        }
        onNext={
          quickDoc && visibleItems.findIndex((item) => item.id === quickDoc.id) < visibleItems.length - 1
            ? () => {
                const index = visibleItems.findIndex((item) => item.id === quickDoc.id)
                setQuickDoc(visibleItems[index + 1])
              }
            : undefined
        }
      />
    </div>
  )
}
