import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react'
import { api } from '@/lib/api'
import { DocumentDetailView } from '@/components/document/DocumentDetail'
import { Skeleton } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import type { DocumentDetail } from '@/types'

export function DocumentPage() {
  const { slug } = useParams<{ slug: string }>()
  const [doc, setDoc] = useState<DocumentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadDoc = async () => {
    if (!slug) return
    setLoading(true)
    setError(null)
    try {
      const data = await api.getDocumentBySlug(slug)
      setDoc(data)
    } catch (err: any) {
      console.error('[DocumentPage fetch error]', err)
      setError(err.message || 'Não foi possível carregar as informações do documento.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDoc()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [slug])

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-80 w-full rounded-3xl" />
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    )
  }

  if (error || !doc) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 rounded-3xl bg-surface-container-lowest border border-outline-variant text-center space-y-4 shadow-sm">
        <AlertCircle className="w-12 h-12 text-rose-700 mx-auto" />
        <h2 className="text-xl font-display text-primary">Documento não encontrado</h2>
        <p className="text-sm text-on-surface-variant leading-relaxed">
          {error || 'O documento solicitado não existe ou foi removido do acervo.'}
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <Link to="/">
            <Button variant="secondary" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Voltar ao Acervo
            </Button>
          </Link>
          <Button variant="primary" size="sm" onClick={loadDoc}>
            <RefreshCw className="w-4 h-4 mr-1.5" /> Tentar Novamente
          </Button>
        </div>
      </div>
    )
  }

  return <DocumentDetailView doc={doc} />
}
