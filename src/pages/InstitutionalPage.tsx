import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react'
import { ArticleBody } from '@/components/document/ArticleBody'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { api } from '@/lib/api'
import type { SitePage } from '@/types'

export function InstitutionalPage() {
  const { slug } = useParams<{ slug: string }>()
  const [page, setPage] = useState<SitePage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadPage = async () => {
    if (!slug) return
    setLoading(true)
    setError(null)
    try {
      const data = await api.getPage(slug)
      setPage(data)
    } catch (err: any) {
      setPage(null)
      setError(err.message || 'Não foi possível carregar esta página.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPage()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [slug])

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-6">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    )
  }

  if (error || !page) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 rounded-3xl bg-surface-container-lowest border border-outline-variant text-center space-y-4 shadow-sm">
        <AlertCircle className="w-12 h-12 text-rose-700 dark:text-rose-300 mx-auto" />
        <h2 className="text-xl font-display text-primary">Página não encontrada</h2>
        <p className="text-sm text-on-surface-variant leading-relaxed">
          {error || 'Esta página institucional não existe ou está oculta.'}
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <Link to="/">
            <Button variant="secondary" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Voltar ao Acervo
            </Button>
          </Link>
          <Button variant="primary" size="sm" onClick={loadPage}>
            <RefreshCw className="w-4 h-4 mr-1.5" /> Tentar Novamente
          </Button>
        </div>
      </div>
    )
  }

  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-6 animate-fadeIn">
      <p className="text-label-sm uppercase tracking-wider text-outline font-semibold">Institucional</p>
      <h1 className="font-display text-3xl sm:text-4xl text-on-surface tracking-tight">{page.title}</h1>
      {page.body ? (
        <ArticleBody stored={page.body} />
      ) : (
        <p className="text-sm text-on-surface-variant">Esta página ainda não tem conteúdo publicado.</p>
      )}
    </article>
  )
}
