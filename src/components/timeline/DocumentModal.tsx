import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, ChevronLeft, ChevronRight, Share2, X } from 'lucide-react'
import type { DocumentItem } from '@/types'
import { formatDate, formatViews, getTypeIconEmoji, getTypeLabel } from '@/lib/utils'

interface DocumentModalProps {
  doc: DocumentItem | null
  onClose: () => void
  onPrevious?: () => void
  onNext?: () => void
}

export function DocumentModal({ doc, onClose, onPrevious, onNext }: DocumentModalProps) {
  const gesture = useRef<{ x: number; y: number } | null>(null)
  const stopTracking = useRef<(() => void) | null>(null)

  useEffect(() => () => stopTracking.current?.(), [])

  useEffect(() => {
    if (!doc) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && onPrevious) {
        e.preventDefault()
        onPrevious()
      }
      if (e.key === 'ArrowRight' && onNext) {
        e.preventDefault()
        onNext()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [doc, onClose, onPrevious, onNext])

  if (!doc) return null

  const year = doc.doc_date ? doc.doc_date.substring(0, 4) : ''
  const category = doc.categories?.[0]?.name
  const fileHref = doc.file_url || doc.source_url
  const facts = [
    { label: 'Data', value: formatDate(doc.doc_date, doc.date_precision) },
    { label: 'Suporte', value: getTypeLabel(doc.doc_type) },
    doc.author ? { label: 'Autoria', value: doc.author } : null,
    doc.location ? { label: 'Local', value: doc.location } : null,
    doc.view_count > 0 ? { label: 'Acessos', value: formatViews(doc.view_count) } : null,
  ].filter((fact): fact is { label: string; value: string } => Boolean(fact))

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

  const finishGesture = (x: number, y: number) => {
    if (!gesture.current) return
    const dx = x - gesture.current.x
    const dy = y - gesture.current.y
    gesture.current = null
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy)) return
    if (dx < 0) onNext?.()
    else onPrevious?.()
  }

  const onPointerDown = (event: React.PointerEvent) => {
    if (event.pointerType === 'mouse') return
    const target = event.target
    if (target instanceof Element && target.closest('a, button')) return
    stopTracking.current?.()
    gesture.current = { x: event.clientX, y: event.clientY }
    const end = (pointerEvent: PointerEvent) => {
      stop()
      finishGesture(pointerEvent.clientX, pointerEvent.clientY)
    }
    const stop = () => {
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
      stopTracking.current = null
    }
    stopTracking.current = stop
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
  }

  return (
    <div
      data-inspector
      className="fixed inset-0 z-50 bg-primary/70 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="flex h-full w-full items-stretch justify-center md:items-center md:p-4 lg:px-20">
        <div className="relative flex h-dvh w-full md:h-auto md:max-w-5xl">
          {onPrevious && (
            <button
              type="button"
              aria-label="Documento anterior"
              onClick={onPrevious}
              className="absolute left-0 top-1/2 z-10 hidden h-12 w-12 -translate-x-[calc(100%+0.75rem)] -translate-y-1/2 items-center justify-center rounded-full bg-surface/90 text-on-surface shadow-lg backdrop-blur-md transition-colors hover:bg-surface md:flex"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}
          {onNext && (
            <button
              type="button"
              aria-label="Próximo documento"
              onClick={onNext}
              className="absolute right-0 top-1/2 z-10 hidden h-12 w-12 translate-x-[calc(100%+0.75rem)] -translate-y-1/2 items-center justify-center rounded-full bg-surface/90 text-on-surface shadow-lg backdrop-blur-md transition-colors hover:bg-surface md:flex"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}
          <div
            className="flex h-full w-full touch-pan-y flex-col overflow-hidden rounded-none bg-surface-container-lowest md:h-auto md:max-h-[92vh] md:rounded-2xl md:shadow-2xl lg:min-h-[32rem] lg:flex-row"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={onPointerDown}
          >
            <div className="relative h-52 shrink-0 bg-primary-container sm:h-64 lg:h-auto lg:w-[46%] lg:self-stretch">
              {doc.thumbnail_url ? (
                <img src={doc.thumbnail_url} alt={doc.title} className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-5xl text-on-primary">
                  {getTypeIconEmoji(doc.doc_type)}
                </div>
              )}
              {(onPrevious || onNext) && (
                <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center md:hidden">
                  <div className="flex items-center gap-2 bg-surface/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-on-surface backdrop-blur-sm">
                    <ChevronLeft className={`h-3.5 w-3.5 ${onPrevious ? 'swipe-nudge-left' : 'opacity-30'}`} />
                    Deslize
                    <ChevronRight className={`h-3.5 w-3.5 ${onNext ? 'swipe-nudge-right' : 'opacity-30'}`} />
                  </div>
                </div>
              )}
              <button
                type="button"
                aria-label="Fechar janela"
                onClick={onClose}
                className="absolute right-3 top-3 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-surface/95 text-on-surface shadow-sm transition-colors hover:bg-primary hover:text-on-primary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex min-h-0 flex-1 touch-pan-y flex-col overflow-y-auto overscroll-contain px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 sm:px-6 sm:py-6 lg:w-[54%] lg:p-8">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  {year && (
                    <span className="rounded-none bg-surface-container-high px-2.5 py-0.5 text-label-md font-semibold text-primary md:rounded">
                      {year}
                    </span>
                  )}
                  {category && (
                    <span className="text-label-sm font-semibold uppercase tracking-wider text-terracotta">
                      {category}
                    </span>
                  )}
                </div>
                <h3 className="font-display text-[1.65rem] font-normal leading-tight text-primary sm:text-headline-md">
                  {doc.title}
                </h3>
                {doc.subtitle && (
                  <p className="font-display text-body-md italic text-on-surface-variant">{doc.subtitle}</p>
                )}
                <p className="text-body-md leading-relaxed text-on-surface-variant">
                  {doc.description || 'Sem descrição cadastrada.'}
                </p>
              </div>
              <dl className="mt-5 divide-y divide-outline-variant/60">
                {facts.map((fact) => (
                  <div key={fact.label} className="flex items-baseline justify-between gap-4 py-2.5">
                    <dt className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-outline">
                      {fact.label}
                    </dt>
                    <dd className="text-right text-body-sm font-medium text-on-surface">{fact.value}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
                <Link
                  to={`/doc/${doc.slug}`}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-none bg-primary px-4 text-label-md font-semibold text-on-primary transition-colors hover:bg-terracotta sm:flex-1 md:rounded-full"
                >
                  Ver ficha completa
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
                <div className="flex gap-2">
                  {fileHref && (
                    <a
                      href={fileHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 flex-1 items-center justify-center rounded-none bg-surface-container px-4 text-label-md font-semibold text-on-surface transition-colors hover:bg-surface-container-high sm:flex-none md:rounded-full"
                    >
                      Arquivo
                    </a>
                  )}
                  <button
                    type="button"
                    title="Compartilhar registro"
                    aria-label="Compartilhar registro"
                    onClick={share}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-none bg-surface-container text-on-surface transition-colors hover:bg-surface-container-high md:rounded-full"
                  >
                    <Share2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
