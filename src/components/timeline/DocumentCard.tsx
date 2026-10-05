import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { DocumentItem } from '@/types'
import { getTypeIconEmoji } from '@/lib/utils'

interface DocumentCardProps {
  doc: DocumentItem
  onSelect: (slug: string) => void
  onQuickView?: (doc: DocumentItem) => void
}

export function DocumentCard({ doc, onSelect, onQuickView }: DocumentCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  const categoryColor = doc.categories?.[0]?.color || '#6366f1'
  const yearText = doc.doc_date ? doc.doc_date.substring(0, 4) : '—'

  return (
    <div
      ref={cardRef}
      className="relative flex-shrink-0 w-52 md:w-60 cursor-pointer select-none py-6 group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
      tabIndex={0}
      role="button"
      aria-label={`Abrir documento: ${doc.title}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onSelect(doc.slug)
        if (e.key === ' ') {
          e.preventDefault()
          if (onQuickView) onQuickView(doc)
        }
      }}
    >
      {/* Timeline connector dot and vertical stem */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 flex flex-col items-center z-20">
        <motion.div
          className="w-4 h-4 rounded-full border-2 border-white shadow-md cursor-pointer"
          style={{ backgroundColor: categoryColor }}
          animate={{ scale: isHovered ? 1.5 : 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          onClick={(e) => {
            e.stopPropagation()
            onSelect(doc.slug)
          }}
        />
        <div className="w-0.5 h-6 bg-gradient-to-b from-white/60 to-white/10" />
      </div>

      {/* Main Document Card */}
      <motion.div
        className="mt-6 bg-gray-900/80 backdrop-blur-xl border border-white/15 rounded-2xl overflow-hidden shadow-2xl transition-colors hover:border-white/30"
        animate={{
          y: isHovered ? -8 : 0,
          boxShadow: isHovered
            ? `0 20px 50px ${categoryColor}33, 0 4px 20px rgba(0,0,0,0.8)`
            : '0 4px 20px rgba(0,0,0,0.6)',
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        onClick={() => onSelect(doc.slug)}
      >
        {/* Thumbnail area */}
        <div className="relative h-32 md:h-36 bg-gray-800/50 overflow-hidden">
          {doc.thumbnail_url ? (
            <motion.img
              src={doc.thumbnail_url}
              alt={doc.title}
              className="w-full h-full object-cover"
              loading="lazy"
              animate={{ scale: isHovered ? 1.08 : 1 }}
              transition={{ duration: 0.4 }}
              onError={(e) => {
                // Fallback on broken image
                (e.target as HTMLElement).style.display = 'none'
              }}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-4xl opacity-60 bg-gradient-to-b from-white/5 to-white/0">
              <span>{getTypeIconEmoji(doc.doc_type)}</span>
              <span className="text-[10px] text-gray-400 font-mono mt-1 uppercase tracking-wider">
                {doc.doc_type.replace('_', ' ')}
              </span>
            </div>
          )}

          {/* Featured Ribbon */}
          {doc.is_featured && (
            <div className="absolute top-2 right-2 text-[10px] bg-amber-400 text-gray-950 px-2 py-0.5 rounded-full font-bold shadow-md flex items-center gap-1">
              ★ Destaque
            </div>
          )}

          {/* Doc Type Badge */}
          <div className="absolute bottom-2 left-2 text-[10px] bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-md text-white/90 border border-white/10 flex items-center gap-1">
            <span>{getTypeIconEmoji(doc.doc_type)}</span>
            <span className="capitalize">{doc.doc_type.replace('_', ' ')}</span>
          </div>
        </div>

        {/* Content Details */}
        <div className="p-3.5 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-indigo-400 font-mono font-semibold">
            <span>{yearText}</span>
            {doc.view_count > 0 && (
              <span className="text-gray-400 text-[11px] font-normal">{doc.view_count} views</span>
            )}
          </div>

          <h3 className="text-sm font-semibold text-white leading-snug line-clamp-2 group-hover:text-indigo-200 transition-colors">
            {doc.title}
          </h3>

          {doc.author && (
            <p className="text-xs text-gray-400 line-clamp-1">{doc.author}</p>
          )}

          {/* Category Badges */}
          {doc.categories && doc.categories.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {doc.categories.slice(0, 2).map((cat) => (
                <span
                  key={cat.slug}
                  className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                  style={{
                    backgroundColor: `${cat.color}25`,
                    color: cat.color,
                    border: `1px solid ${cat.color}50`,
                  }}
                >
                  {cat.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* Hover Floating Tooltip */}
      <AnimatePresence>
        {isHovered && doc.description && (
          <motion.div
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-50 w-64 bg-gray-900/95 backdrop-blur-xl border border-white/20 rounded-xl p-3.5 shadow-2xl pointer-events-none"
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            <p className="text-xs text-gray-200 leading-relaxed line-clamp-4">
              {doc.description}
            </p>
            <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-indigo-300 font-medium">
              <span>Clique para ver detalhes</span>
              <span>→</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
