import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ExternalLink, Calendar, MapPin, User, FileText } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { DocumentItem } from '@/types'
import { formatDate, getTypeLabel, getTypeIconEmoji } from '@/lib/utils'

interface DocumentModalProps {
  doc: DocumentItem | null
  onClose: () => void
}

export function DocumentModal({ doc, onClose }: DocumentModalProps) {
  if (!doc) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />

        {/* Modal Window */}
        <motion.div
          className="relative w-full max-w-2xl bg-gray-900 border border-white/20 rounded-2xl overflow-hidden shadow-2xl z-10 flex flex-col max-h-[85vh]"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
        >
          {/* Header image or preview */}
          <div className="relative h-48 sm:h-64 bg-gray-800 w-full overflow-hidden flex-shrink-0">
            {doc.thumbnail_url ? (
              <img
                src={doc.thumbnail_url}
                alt={doc.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-6xl opacity-50 bg-gradient-to-t from-gray-950 to-gray-800">
                <span>{getTypeIconEmoji(doc.doc_type)}</span>
              </div>
            )}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center border border-white/20 transition-all shadow-lg"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="absolute bottom-3 left-4 flex flex-wrap gap-1.5">
              {doc.categories?.map((c) => (
                <span
                  key={c.slug}
                  className="text-xs px-2.5 py-0.5 rounded-full font-medium shadow-md"
                  style={{ backgroundColor: c.color, color: '#ffffff' }}
                >
                  {c.name}
                </span>
              ))}
            </div>
          </div>

          {/* Content Body */}
          <div className="p-6 overflow-y-auto space-y-4">
            <div>
              <div className="flex items-center gap-3 text-xs text-indigo-400 font-mono mb-1">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDate(doc.doc_date, doc.date_precision)}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" />
                  {getTypeLabel(doc.doc_type)}
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-white leading-tight">
                {doc.title}
              </h2>
              {doc.subtitle && (
                <p className="text-sm text-gray-400 mt-1 font-medium">{doc.subtitle}</p>
              )}
            </div>

            {/* Metadata tags */}
            <div className="flex flex-wrap gap-4 py-2 border-y border-white/10 text-xs text-gray-300">
              {doc.author && (
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-gray-500" />
                  <span>{doc.author}</span>
                </div>
              )}
              {doc.location && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-gray-500" />
                  <span>{doc.location}</span>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="text-sm text-gray-300 leading-relaxed space-y-2">
              <p>{doc.description || 'Sem descrição cadastrada.'}</p>
            </div>
          </div>

          {/* Footer action */}
          <div className="p-4 border-t border-white/10 bg-gray-950/60 flex items-center justify-between">
            <span className="text-xs text-gray-500">Pressione Esc para fechar</span>
            <Link
              to={`/doc/${doc.slug}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all"
            >
              <span>Ver Documento Completo</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
