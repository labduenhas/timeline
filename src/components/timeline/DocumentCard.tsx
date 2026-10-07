import { useEffect, useRef, useState, type RefObject } from 'react'
import { ArrowUpRight, Eye } from 'lucide-react'
import type { DocumentItem } from '@/types'
import { formatViews, getTypeIconEmoji, getTypeLabel } from '@/lib/utils'

interface DocumentCardProps {
  doc: DocumentItem
  trackRef: RefObject<HTMLDivElement>
  onQuickView?: (doc: DocumentItem) => void
}

export function DocumentCard({ doc, trackRef, onQuickView }: DocumentCardProps) {
  const cardRef = useRef<HTMLElement>(null)
  const [revealed, setRevealed] = useState(false)
  const yearText = doc.doc_date ? doc.doc_date.substring(0, 4) : ''
  const categoryName = doc.categories?.[0]?.name

  useEffect(() => {
    const card = cardRef.current
    if (!card) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setRevealed(true)
        })
      },
      { root: trackRef.current, threshold: 0.25 }
    )

    observer.observe(card)
    return () => observer.disconnect()
  }, [trackRef])

  return (
    <article
      ref={cardRef}
      data-year={yearText}
      className="timeline-card group flex-shrink-0 w-[78vw] max-w-[340px] sm:w-[360px] sm:max-w-none lg:w-[410px] flex flex-col bg-surface-container-lowest rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.04)] hover:shadow-[0_16px_36px_rgba(0,0,0,0.08)] transition-all duration-500 overflow-hidden"
    >
      <div className="relative w-full aspect-[4/5] overflow-hidden bg-primary-container">
        <div
          className="absolute inset-y-0 left-0 w-1/2 bg-primary-container z-20 pointer-events-none transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{ transform: revealed ? 'translateX(-100%)' : 'translateX(0)' }}
        />
        <div
          className="absolute inset-y-0 right-0 w-1/2 bg-primary-container z-20 pointer-events-none transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{ transform: revealed ? 'translateX(100%)' : 'translateX(0)' }}
        />
        {doc.thumbnail_url ? (
          <img
            src={doc.thumbnail_url}
            alt={doc.title}
            draggable={false}
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-on-primary gap-2">
            <span className="text-5xl">{getTypeIconEmoji(doc.doc_type)}</span>
            <span className="text-label-sm uppercase tracking-widest text-surface-variant">
              {getTypeLabel(doc.doc_type)}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/20 to-transparent flex flex-col justify-end p-6 z-10 pointer-events-none">
          <h2 className="font-display text-headline-sm text-on-primary font-normal leading-snug">
            {doc.title}
          </h2>
          {doc.subtitle && (
            <p className="text-body-sm text-surface-variant font-light mt-1 line-clamp-2">
              {doc.subtitle}
            </p>
          )}
        </div>
        {yearText && (
          <div className="absolute top-4 left-4 z-10 pointer-events-none bg-surface/90 backdrop-blur-md px-3 py-1 rounded shadow-sm text-primary font-display text-[20px] font-medium leading-none">
            {yearText}
          </div>
        )}
      </div>

      <div className="p-6 flex flex-col justify-between flex-grow bg-surface-container-lowest">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-outline">
            <span className="text-label-sm uppercase tracking-wider text-terracotta font-semibold">
              {categoryName || getTypeLabel(doc.doc_type)}
            </span>
            {doc.view_count > 0 && (
              <span className="text-label-sm flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />
                {formatViews(doc.view_count)}
              </span>
            )}
          </div>
          {doc.description && (
            <p className="text-body-sm text-on-surface-variant leading-relaxed line-clamp-3">
              {doc.description}
            </p>
          )}
        </div>
        <div className="pt-6 mt-4 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-label-sm text-outline uppercase tracking-wider">Suporte</span>
            <span className="text-body-sm text-on-surface font-medium">{getTypeLabel(doc.doc_type)}</span>
          </div>
          <button
            type="button"
            onClick={() => onQuickView?.(doc)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-surface-container hover:bg-primary hover:text-on-primary text-on-surface text-label-md font-semibold transition-colors"
          >
            <span>Examinar</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </article>
  )
}
