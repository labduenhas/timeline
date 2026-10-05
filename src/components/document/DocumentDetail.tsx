import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Calendar, MapPin, User, Building, Eye, Share2, Tag as TagIcon } from 'lucide-react'
import type { DocumentDetail as DocumentDetailType } from '@/types'
import { formatDate, getTypeLabel, getTypeIconEmoji } from '@/lib/utils'
import { MediaViewer } from './MediaViewer'
import { DownloadButton } from './DownloadButton'
import { Button } from '@/components/ui/Button'

interface DocumentDetailProps {
  doc: DocumentDetailType
}

export function DocumentDetailView({ doc }: DocumentDetailProps) {
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: doc.title,
        text: doc.description || doc.subtitle || '',
        url: window.location.href,
      }).catch(console.error)
    } else {
      navigator.clipboard.writeText(window.location.href)
      alert('Link copiado para a área de transferência!')
    }
  }

  return (
    <article className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-fadeIn">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link to="/">
          <Button variant="ghost" size="sm" className="gap-2 text-gray-400 hover:text-white">
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar para a Linha do Tempo</span>
          </Button>
        </Link>
        <Button variant="outline" size="sm" onClick={handleShare} className="gap-2">
          <Share2 className="w-4 h-4 text-indigo-400" />
          <span>Compartilhar</span>
        </Button>
      </div>

      {/* Header Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gray-900 border border-white/10 shadow-2xl">
        {doc.cover_image_url || doc.thumbnail_url ? (
          <div className="relative h-64 sm:h-96 w-full overflow-hidden">
            <img
              src={doc.cover_image_url || doc.thumbnail_url || ''}
              alt={doc.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/60 to-transparent" />
          </div>
        ) : (
          <div className="h-40 bg-gradient-to-tr from-indigo-950/50 via-gray-900 to-purple-950/50 flex items-center justify-center">
            <span className="text-6xl opacity-30">{getTypeIconEmoji(doc.doc_type)}</span>
          </div>
        )}

        {/* Floating Title and Meta in Banner */}
        <div className="p-6 sm:p-8 -mt-20 sm:-mt-28 relative z-10 space-y-4">
          {/* Categories & Type */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white font-mono flex items-center gap-1.5">
              <span>{getTypeIconEmoji(doc.doc_type)}</span>
              <span>{getTypeLabel(doc.doc_type)}</span>
            </span>

            {doc.categories?.map((cat) => (
              <span
                key={cat.id || cat.slug}
                className="text-xs px-3 py-1 rounded-full font-medium shadow-lg backdrop-blur-md"
                style={{
                  backgroundColor: cat.color,
                  color: '#ffffff',
                }}
              >
                {cat.name}
              </span>
            ))}
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            {doc.title}
          </h1>

          {doc.subtitle && (
            <p className="text-base sm:text-lg text-indigo-300 font-medium">{doc.subtitle}</p>
          )}

          {/* Metadata Badges Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-white/10 text-xs text-gray-300">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-400" />
              <div>
                <span className="text-gray-500 block text-[10px]">DATA DO REGISTRO</span>
                <span className="font-semibold text-white">
                  {formatDate(doc.doc_date, doc.date_precision)}
                </span>
              </div>
            </div>

            {doc.author && (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-400" />
                <div>
                  <span className="text-gray-500 block text-[10px]">AUTORIA</span>
                  <span className="font-semibold text-white">{doc.author}</span>
                </div>
              </div>
            )}

            {doc.location && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-indigo-400" />
                <div>
                  <span className="text-gray-500 block text-[10px]">LOCALIZAÇÃO</span>
                  <span className="font-semibold text-white">{doc.location}</span>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-indigo-400" />
              <div>
                <span className="text-gray-500 block text-[10px]">VISUALIZAÇÕES</span>
                <span className="font-semibold text-white">{doc.view_count || 1} acessos</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Media / Video / PDF / Audio Player */}
      <MediaViewer
        media={doc.media}
        sourceUrl={doc.source_url}
        fileUrl={doc.file_url}
        docType={doc.doc_type}
        title={doc.title}
      />

      {/* Description & Main Body Content */}
      <div className="bg-gray-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-6 sm:p-8 space-y-6">
        {doc.description && (
          <div className="text-base text-gray-300 font-light leading-relaxed border-l-2 border-indigo-500 pl-4 py-1 italic">
            {doc.description}
          </div>
        )}

        {doc.body && (
          <div
            className="prose prose-invert max-w-none text-gray-200 leading-relaxed space-y-4"
            dangerouslySetInnerHTML={{ __html: doc.body }}
          />
        )}

        {/* Download File Action */}
        {(doc.file_url || doc.source_url) && (
          <div className="pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
            <span className="text-xs text-gray-400">
              Acervo digital preservado no Cloudflare R2
            </span>
            <DownloadButton
              url={doc.file_url || doc.source_url}
              filename={`${doc.slug}.${doc.doc_type === 'pdf' ? 'pdf' : 'bin'}`}
            />
          </div>
        )}
      </div>

      {/* Tags section */}
      {doc.tags && doc.tags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap text-xs text-gray-400">
          <TagIcon className="w-3.5 h-3.5 text-indigo-400" />
          <span className="font-semibold text-gray-300">Tags:</span>
          {doc.tags.map((t) => (
            <span
              key={typeof t === 'string' ? t : t.id}
              className="px-2.5 py-0.5 rounded-md bg-gray-900 border border-white/10 text-gray-300 font-mono text-[11px]"
            >
              #{typeof t === 'string' ? t : t.name}
            </span>
          ))}
        </div>
      )}

      {/* Related Documents */}
      {doc.related && doc.related.length > 0 && (
        <div className="pt-8 border-t border-white/10 space-y-4">
          <h3 className="text-lg font-bold text-white tracking-tight">
            Outros Documentos Históricos Relacionados
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {doc.related.map((rel) => (
              <Link
                key={rel.id}
                to={`/doc/${rel.slug}`}
                className="group block rounded-2xl bg-gray-900 border border-white/10 overflow-hidden hover:border-indigo-500/50 transition-all shadow-lg"
              >
                <div className="h-28 bg-gray-800 overflow-hidden">
                  {rel.thumbnail_url ? (
                    <img
                      src={rel.thumbnail_url}
                      alt={rel.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl opacity-40">
                      {getTypeIconEmoji(rel.doc_type)}
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <span className="text-[10px] text-indigo-400 font-mono font-medium block">
                    {formatDate(rel.doc_date, 'year')}
                  </span>
                  <h4 className="text-xs font-semibold text-white line-clamp-2 group-hover:text-indigo-300 transition-colors">
                    {rel.title}
                  </h4>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </article>
  )
}
