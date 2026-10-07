import { Link } from 'react-router-dom'
import { ArrowLeft, Calendar, Eye, MapPin, Share2, Tag as TagIcon, User } from 'lucide-react'
import type { DocumentDetail as DocumentDetailType } from '@/types'
import { formatDate, getTypeIconEmoji, getTypeLabel } from '@/lib/utils'
import { MediaViewer } from './MediaViewer'
import { DownloadButton } from './DownloadButton'
import { Button } from '@/components/ui/Button'
import { ArticleBody } from './ArticleBody'

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
    <article className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-margin-desktop py-6 sm:py-8 space-y-8 animate-fadeIn">
      <div className="flex items-center justify-between gap-3">
        <Link to="/" className="min-w-0">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="w-4 h-4 shrink-0" />
            <span className="sm:hidden">Voltar</span>
            <span className="hidden sm:inline">Voltar para a Linha do Tempo</span>
          </Button>
        </Link>
        <Button variant="outline" size="sm" onClick={handleShare} className="gap-2 shrink-0">
          <Share2 className="w-4 h-4" />
          <span className="hidden sm:inline">Compartilhar</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="relative rounded-xl overflow-hidden bg-primary-container aspect-[4/3] sm:aspect-[4/5] lg:aspect-auto lg:min-h-[560px]">
          {doc.cover_image_url || doc.thumbnail_url ? (
            <img
              src={doc.cover_image_url || doc.thumbnail_url || ''}
              alt={doc.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-6xl text-on-primary">
              {getTypeIconEmoji(doc.doc_type)}
            </div>
          )}
        </div>

        <div className="space-y-5 lg:py-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded bg-surface-container-high text-primary text-label-md font-semibold">
              {formatDate(doc.doc_date, 'year')}
            </span>
            <span className="text-label-sm uppercase tracking-wider text-outline">
              {getTypeLabel(doc.doc_type)}
            </span>
            {doc.categories?.map((cat) => (
              <span key={cat.id || cat.slug} className="text-label-sm uppercase tracking-wider text-terracotta font-semibold">
                {cat.name}
              </span>
            ))}
          </div>

          <h1 className="font-display text-[2rem] sm:text-display-xl text-primary font-normal tracking-tight leading-[1.12]">
            {doc.title}
          </h1>

          {doc.subtitle && (
            <p className="font-display italic text-body-lg text-on-surface-variant">{doc.subtitle}</p>
          )}

          <div className="grid grid-cols-1 gap-3 pt-2 text-body-sm sm:grid-cols-2 sm:gap-4">
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-outline mt-0.5" />
              <div>
                <span className="text-outline block text-[11px] uppercase tracking-wider">Data</span>
                <span className="font-medium text-on-surface">{formatDate(doc.doc_date, doc.date_precision)}</span>
              </div>
            </div>
            {doc.author && (
              <div className="flex items-start gap-2">
                <User className="w-4 h-4 text-outline mt-0.5" />
                <div>
                  <span className="text-outline block text-[11px] uppercase tracking-wider">Autoria</span>
                  <span className="font-medium text-on-surface">{doc.author}</span>
                </div>
              </div>
            )}
            {doc.location && (
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-outline mt-0.5" />
                <div>
                  <span className="text-outline block text-[11px] uppercase tracking-wider">Local</span>
                  <span className="font-medium text-on-surface">{doc.location}</span>
                </div>
              </div>
            )}
            <div className="flex items-start gap-2">
              <Eye className="w-4 h-4 text-outline mt-0.5" />
              <div>
                <span className="text-outline block text-[11px] uppercase tracking-wider">Acessos</span>
                <span className="font-medium text-on-surface">{doc.view_count || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <MediaViewer
        media={doc.media}
        sourceUrl={doc.source_url}
        fileUrl={doc.file_url}
        docType={doc.doc_type}
        title={doc.title}
      />

      <div className="bg-surface-container-lowest border border-outline-variant/70 rounded-2xl p-4 sm:p-8 space-y-6">
        {doc.description && (
          <p className="text-body-lg text-on-surface-variant font-display italic border-l-2 border-terracotta pl-4">
            {doc.description}
          </p>
        )}

        {doc.body && <ArticleBody stored={doc.body} />}

        {(doc.file_url || doc.source_url) && (
          <div className="pt-6 border-t border-outline-variant/70 flex flex-wrap items-center justify-between gap-4">
            <span className="text-body-sm text-outline">Cópia digital do registro</span>
            <DownloadButton
              url={doc.file_url || doc.source_url}
              filename={`${doc.slug}.${doc.doc_type === 'pdf' ? 'pdf' : 'bin'}`}
            />
          </div>
        )}
      </div>

      {doc.tags && doc.tags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap text-body-sm text-on-surface-variant">
          <TagIcon className="w-3.5 h-3.5 text-terracotta" />
          {doc.tags.map((t) => (
            <span
              key={typeof t === 'string' ? t : t.id}
              className="px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface text-[11px]"
            >
              {typeof t === 'string' ? t : t.name}
            </span>
          ))}
        </div>
      )}

      {doc.related && doc.related.length > 0 && (
        <div className="pt-8 border-t border-outline-variant/70 space-y-4">
          <h3 className="font-display text-headline-md text-primary font-normal">
            Outros documentos relacionados
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
            {doc.related.map((rel) => (
              <Link
                key={rel.id}
                to={`/doc/${rel.slug}`}
                className="group flex gap-3 rounded-xl bg-surface-container-lowest border border-outline-variant/60 overflow-hidden hover:shadow-md transition-all sm:block"
              >
                <div className="h-24 w-24 shrink-0 bg-surface-container overflow-hidden sm:h-28 sm:w-full">
                  {rel.thumbnail_url ? (
                    <img
                      src={rel.thumbnail_url}
                      alt={rel.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl">
                      {getTypeIconEmoji(rel.doc_type)}
                    </div>
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-center p-3 sm:block">
                  <span className="text-label-sm text-terracotta font-semibold block">
                    {formatDate(rel.doc_date, 'year')}
                  </span>
                  <h4 className="text-sm font-medium text-on-surface line-clamp-2 group-hover:text-terracotta transition-colors">
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
