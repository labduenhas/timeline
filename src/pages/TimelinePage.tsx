import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, FolderArchive, Search } from 'lucide-react'
import { api } from '@/lib/api'
import { cn, formatViews, formatYearOnly, getTypeIconEmoji, getTypeLabel } from '@/lib/utils'
import { Skeleton } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import type { Category, DocumentItem } from '@/types'
import { useSite } from '@/context/SiteContext'

export function TimelinePage() {
  const { settings } = useSite()
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')

  const loadDocs = async (nextPage = page, nextSearch = search, nextCategory = selectedCategory) => {
    setLoading(true)
    try {
      const res = await api.getDocuments({
        page: nextPage,
        limit: 12,
        search: nextSearch || undefined,
        category: nextCategory || undefined,
      })
      setDocuments(res.items || [])
      setTotal(res.total || 0)
      setTotalPages(res.total_pages || 1)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    api.getCategories().then((res) => {
      setCategories(res.categories || [])
    }).catch(console.error)
  }, [])

  useEffect(() => {
    loadDocs()
  }, [page, selectedCategory])

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-margin-desktop py-10 space-y-8 animate-fadeIn">
      <div className="max-w-3xl space-y-3">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-terracotta text-white dark:text-[#1a1612] text-label-sm uppercase tracking-widest">
          {settings.explore_badge}
        </span>
        <h1 className="font-display text-4xl sm:text-display-xl text-primary font-normal tracking-tight leading-[1.08]">
          {settings.explore_title}
        </h1>
        <p className="text-body-lg text-on-surface-variant">
          {settings.explore_lead}
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          setPage(1)
          setSearch(query)
          loadDocs(1, query, selectedCategory)
        }}
        className="relative flex items-center max-w-3xl bg-surface-container-lowest rounded-full shadow-sm overflow-hidden border border-outline-variant/60"
      >
        <input
          type="text"
          placeholder={settings.explore_search_placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full py-4 pl-6 pr-16 bg-transparent text-on-surface placeholder:text-outline text-body-md focus:outline-none"
        />
        <button
          type="submit"
          aria-label="Buscar"
          className="absolute right-2 w-11 h-11 rounded-full bg-primary text-on-primary flex items-center justify-center hover:bg-terracotta transition-colors"
        >
          <Search className="w-5 h-5" />
        </button>
      </form>

      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => {
            setSelectedCategory('')
            setPage(1)
          }}
          className={cn(
            'px-4 py-2 rounded-full text-label-md font-semibold whitespace-nowrap',
            !selectedCategory ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface hover:bg-surface-container-highest'
          )}
        >
          Todas as Categorias
        </button>
        {categories.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setSelectedCategory(item.slug === selectedCategory ? '' : item.slug)
              setPage(1)
            }}
            className={cn(
              'px-4 py-2 rounded-full text-label-md font-semibold whitespace-nowrap',
              selectedCategory === item.slug
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container text-on-surface hover:bg-surface-container-highest'
            )}
          >
            {item.name}
          </button>
        ))}
        <span className="ml-auto text-label-sm uppercase tracking-widest text-outline whitespace-nowrap pl-4">
          {total} {total === 1 ? 'resultado' : 'resultados'}
        </span>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-[4/5] w-full rounded-xl" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-5 w-2/3" />
            </div>
          ))}
        </div>
      ) : documents.length === 0 ? (
        <div className="p-12 text-center bg-surface-container-lowest border border-outline-variant rounded-3xl max-w-lg mx-auto space-y-4">
          <FolderArchive className="w-12 h-12 text-outline mx-auto" />
          <h3 className="text-lg font-display text-primary">Nenhum documento encontrado</h3>
          <p className="text-sm text-on-surface-variant">Tente outros termos ou limpe o filtro de categoria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {documents.map((doc) => (
            <Link
              key={doc.id}
              to={`/doc/${doc.slug}`}
              className="group bg-surface-container-lowest rounded-xl overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.04)] hover:shadow-[0_16px_36px_rgba(0,0,0,0.08)] transition-all duration-500 flex flex-col"
            >
              <div className="relative aspect-[4/5] bg-primary-container overflow-hidden">
                {doc.thumbnail_url ? (
                  <img
                    src={doc.thumbnail_url}
                    alt={doc.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-white gap-2">
                    <span className="text-4xl">{getTypeIconEmoji(doc.doc_type)}</span>
                    <span className="text-label-sm uppercase tracking-widest">{getTypeLabel(doc.doc_type)}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-scrim/90 via-scrim/10 to-transparent flex flex-col justify-end p-6 pointer-events-none">
                  <h2 className="font-display text-headline-sm text-white font-normal leading-snug">
                    {doc.title}
                  </h2>
                </div>
                <div className="absolute top-4 left-4 bg-surface/90 backdrop-blur-md px-3 py-1 rounded text-primary font-display text-[20px] leading-none">
                  {formatYearOnly(doc.doc_date) || '—'}
                </div>
              </div>
              <div className="p-6 space-y-3">
                <div className="flex items-center justify-between text-outline">
                  <span className="text-label-sm uppercase tracking-wider text-terracotta font-semibold">
                    {doc.categories?.[0]?.name || getTypeLabel(doc.doc_type)}
                  </span>
                  {doc.view_count > 0 && (
                    <span className="text-label-sm flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" />
                      {formatViews(doc.view_count)}
                    </span>
                  )}
                </div>
                {doc.description && (
                  <p className="text-body-sm text-on-surface-variant line-clamp-3">{doc.description}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-4">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Anterior
          </Button>
          <span className="text-label-sm text-outline px-2">
            Página {page} de {totalPages}
          </span>
          <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            Próxima
          </Button>
        </div>
      )}
    </div>
  )
}
