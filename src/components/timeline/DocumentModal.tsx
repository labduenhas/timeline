import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Share2, X } from 'lucide-react'
import type { DocumentItem } from '@/types'
import { formatDate, formatViews, getTypeIconEmoji, getTypeLabel } from '@/lib/utils'

interface DocumentModalProps {
  doc: DocumentItem | null
  onClose: () => void
}

export function DocumentModal({ doc, onClose }: DocumentModalProps) {
  useEffect(() => {
    if (!doc) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [doc, onClose])

  if (!doc) return null

  const year = doc.doc_date ? doc.doc_date.substring(0, 4) : ''
  const category = doc.categories?.[0]?.name
  const fileHref = doc.file_url || doc.source_url

  const share = async () => {
    const url = `${window.location.origin}/doc/${doc.slug}`
    if (navigator.share) {
      try {
        await navigator.share({ title: doc.title, url })
      } catch {
        /* dismiss */
      }
      return
    }
    await navigator.clipboard.writeText(url)
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-primary/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="relative w-full max-w-4xl bg-surface-container-lowest rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]">
        <button
          type="button"
          aria-label="Fechar janela"
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-surface-container-highest hover:bg-primary hover:text-on-primary flex items-center justify-center text-on-surface transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="md:w-1/2 bg-primary-container relative min-h-[240px] md:min-h-[300px]">
          {doc.thumbnail_url ? (
            <img src={doc.thumbnail_url} alt={doc.title} className="w-full h-full object-cover absolute inset-0" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-5xl text-on-primary">
              {getTypeIconEmoji(doc.doc_type)}
            </div>
          )}
        </div>
        <div className="md:w-1/2 p-8 flex flex-col justify-between overflow-y-auto">
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              {year && (
                <span className="px-2.5 py-0.5 rounded bg-surface-container-high text-primary text-label-md font-semibold">
                  {year}
                </span>
              )}
              {category && (
                <span className="text-label-sm uppercase tracking-wider text-terracotta font-semibold">
                  {category}
                </span>
              )}
            </div>
            <h3 className="font-display text-headline-md text-primary font-normal pr-8">
              {doc.title}
            </h3>
            {doc.subtitle && (
              <p className="text-body-md text-on-surface-variant italic font-display">{doc.subtitle}</p>
            )}
            <p className="text-body-md text-on-surface-variant leading-relaxed">
              {doc.description || 'Sem descrição cadastrada.'}
            </p>
          </div>
          <div className="pt-6 mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-body-sm text-on-surface-variant">
              <div>
                <span className="block text-outline text-[11px] uppercase tracking-wider font-semibold">Data</span>
                <span className="font-medium text-on-surface">{formatDate(doc.doc_date, doc.date_precision)}</span>
              </div>
              <div>
                <span className="block text-outline text-[11px] uppercase tracking-wider font-semibold">Suporte</span>
                <span className="font-medium text-on-surface">{getTypeLabel(doc.doc_type)}</span>
              </div>
              {doc.author && (
                <div>
                  <span className="block text-outline text-[11px] uppercase tracking-wider font-semibold">Autoria</span>
                  <span className="font-medium text-on-surface">{doc.author}</span>
                </div>
              )}
              {doc.location && (
                <div>
                  <span className="block text-outline text-[11px] uppercase tracking-wider font-semibold">Local</span>
                  <span className="font-medium text-on-surface">{doc.location}</span>
                </div>
              )}
              {doc.view_count > 0 && (
                <div>
                  <span className="block text-outline text-[11px] uppercase tracking-wider font-semibold">Acessos</span>
                  <span className="font-medium text-on-surface">{formatViews(doc.view_count)}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Link
                to={`/doc/${doc.slug}`}
                className="flex-1 py-3 rounded-full bg-primary hover:bg-terracotta text-on-primary text-label-md font-semibold transition-colors text-center inline-flex items-center justify-center gap-1.5"
              >
                Ver ficha completa
                <ArrowUpRight className="w-4 h-4" />
              </Link>
              {fileHref && (
                <a
                  href={fileHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-3 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface text-label-md font-semibold transition-colors"
                >
                  Arquivo
                </a>
              )}
              <button
                type="button"
                title="Compartilhar registro"
                onClick={share}
                className="w-12 h-12 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface transition-colors"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
