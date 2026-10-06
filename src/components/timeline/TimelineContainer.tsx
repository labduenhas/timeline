import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AlertCircle, ArrowLeft, ArrowRight, FolderArchive, RefreshCw, Search } from 'lucide-react'
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
  const [tags, setTags] = useState<Tag[]>([])

  const { items, periodBackgrounds, total, loading, error, refetch } = useTimeline({
    category,
    search,
  })

  const featured = useMemo(() => items.filter((item) => item.is_featured), [items])
  const hero = featured[0]
  const side = featured.slice(1, 3)

  const handleActiveIndex = useCallback((index: number) => {
    setActiveIndex(index)
  }, [])

  useEffect(() => {
    api.getCategories().then((res) => setTags(res.tags || [])).catch(console.error)
    api.getTimeline().then((res) => setCatalogTotal(res.total)).catch(console.error)
  }, [])

  useEffect(() => {
    const id = location.hash.replace('#', '')
    if (!id) return
    const timer = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
    return () => window.clearTimeout(timer)
  }, [location.hash, loading])

  useEffect(() => {
    const current = items[activeIndex - 1]
    if (!current?.doc_date) {
      setActiveEra(null)
      return
    }
    const year = Number(current.doc_date.substring(0, 4))
    const match = periodBackgrounds.find((period) => year >= period.year_start && year <= period.year_end)
    setActiveEra(match ? match.year_start : null)
  }, [activeIndex, items, periodBackgrounds])

  const applySearch = (value: string) => {
    setQuery(value)
    setSearch(value)
  }

  return (
    <div className="flex flex-col w-full text-on-surface">
      <section className="max-w-[1440px] mx-auto w-full px-4 sm:px-8 lg:px-margin-desktop pt-8 pb-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8">
          <div className="max-w-3xl">
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
          <div className="flex items-center gap-4 self-start md:self-end">
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
        <FilterBar category={category} onCategoryChange={setCategory} />
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
                {items.length === 0 ? '0 itens' : `${activeIndex} de ${items.length} itens`}
              </span>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="w-full px-4 sm:px-8 lg:px-margin-desktop py-10 flex gap-8 overflow-x-hidden">
          {[1, 2, 3].map((i) => (
            <div key={i} className="w-[340px] sm:w-[410px] flex-shrink-0 space-y-3">
              <Skeleton className="aspect-[4/5] w-full rounded-xl" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-5 w-full" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="max-w-md mx-auto my-12 p-6 rounded-2xl bg-surface-container-lowest border border-rose-200 text-center space-y-4 shadow-sm">
          <AlertCircle className="w-12 h-12 text-rose-700 mx-auto" />
          <h3 className="text-lg font-display text-primary">Falha ao carregar o acervo</h3>
          <p className="text-sm text-on-surface-variant">{error}</p>
          <Button variant="primary" onClick={refetch} className="mx-auto">
            <RefreshCw className="w-4 h-4 mr-2" /> Tentar novamente
          </Button>
        </div>
      ) : items.length === 0 ? (
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
          items={items}
          containerRef={trackRef}
          onQuickViewDoc={setQuickDoc}
          onActiveIndexChange={handleActiveIndex}
        />
      )}

      {featured.length > 0 && (
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

      <section id="pesquisa" className="w-full bg-surface-container py-16 scroll-mt-28">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-margin-desktop">
          <div className="max-w-3xl mx-auto text-center mb-8">
            <h3 className="font-display text-headline-lg text-primary font-normal">
              Pesquisa no Acervo Histórico
            </h3>
            <p className="text-body-md text-on-surface-variant mt-2">
              Localize manuscritos, pinturas e registros pelo título, autor ou período.
            </p>
          </div>
          <form
            className="relative flex items-center max-w-3xl mx-auto bg-surface-container-lowest rounded-full shadow-sm overflow-hidden"
            onSubmit={(e) => {
              e.preventDefault()
              setSearch(query)
            }}
          >
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full py-4 pl-6 pr-16 bg-transparent text-on-surface placeholder:text-outline text-body-md focus:outline-none"
              placeholder="Buscar por título, autor, movimento, cidade ou período histórico..."
              type="text"
            />
            <button
              aria-label="Executar busca"
              className="absolute right-2 w-11 h-11 rounded-full bg-primary text-on-primary flex items-center justify-center hover:bg-terracotta transition-colors"
              type="submit"
            >
              <Search className="w-5 h-5" />
            </button>
          </form>
          {tags.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-2 mt-4 text-on-surface-variant text-body-sm">
              <span className="text-outline font-medium">Termos frequentes:</span>
              {tags.slice(0, 4).map((tag, index) => (
                <span key={tag.id} className="flex items-center gap-2">
                  {index > 0 && <span className="text-outline-variant">•</span>}
                  <button
                    type="button"
                    className="hover:text-primary underline underline-offset-4"
                    onClick={() => applySearch(tag.name)}
                  >
                    {tag.name}
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      <DocumentModal doc={quickDoc} onClose={() => setQuickDoc(null)} />
    </div>
  )
}
