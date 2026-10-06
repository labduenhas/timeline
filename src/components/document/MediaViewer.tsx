import React, { useState } from 'react'
import { Eye, ExternalLink, Play, Volume2, FileText, Image as ImageIcon } from 'lucide-react'
import type { DocumentMedia, DocType } from '@/types'

interface MediaViewerProps {
  media?: DocumentMedia[]
  sourceUrl?: string | null
  fileUrl?: string | null
  docType: DocType
  title: string
}

export function MediaViewer({ media = [], sourceUrl, fileUrl, docType, title }: MediaViewerProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  // Determine YouTube/Vimeo embed
  const getEmbedUrl = (url?: string | null) => {
    if (!url) return null
    if (url.includes('youtube.com/watch') || url.includes('youtu.be/')) {
      const match = url.match(/(?:youtu\.be\/|watch\?v=)([^&]+)/)
      const id = match ? match[1] : null
      return id ? `https://www.youtube.com/embed/${id}` : null
    }
    if (url.includes('vimeo.com/')) {
      const id = url.split('/').pop()
      return id ? `https://player.vimeo.com/video/${id}` : null
    }
    return null
  }

  const embedUrl = getEmbedUrl(sourceUrl)

  return (
    <div className="space-y-6">
      {/* Video Embed Player */}
      {(docType === 'video_url' || embedUrl) && embedUrl && (
        <div className="w-full aspect-video rounded-2xl overflow-hidden bg-black border border-outline-variant shadow-2xl">
          <iframe
            src={embedUrl}
            title={title}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      {/* Direct Video File (R2) */}
      {docType === 'video_file' && fileUrl && (
        <div className="w-full rounded-2xl overflow-hidden bg-black border border-outline-variant shadow-2xl">
          <video
            src={fileUrl}
            controls
            className="w-full max-h-[600px] object-contain"
          >
            Seu navegador não suporta a reprodução deste vídeo.
          </video>
        </div>
      )}

      {/* Audio Player */}
      {docType === 'audio' && fileUrl && (
        <div className="p-6 rounded-2xl bg-surface-container border border-outline-variant shadow-2xl space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-on-primary">
              <Volume2 className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-on-surface">Gravação de Áudio do Acervo</h4>
              <p className="text-xs text-outline">Clique no player abaixo para ouvir o registro histórico</p>
            </div>
          </div>
          <audio controls className="w-full mt-2" src={fileUrl}>
            Seu navegador não suporta reprodução de áudio.
          </audio>
        </div>
      )}

      {/* PDF Document Embedded Viewer */}
      {docType === 'pdf' && fileUrl && (
        <div className="w-full h-[650px] rounded-2xl overflow-hidden border border-outline-variant bg-surface-container-lowest shadow-2xl">
          <iframe
            src={`${fileUrl}#view=FitH`}
            title={`PDF: ${title}`}
            className="w-full h-full"
          />
        </div>
      )}

      {/* Attached Media Gallery */}
      {media.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-on-surface-variant uppercase tracking-wider font-mono">
            Mídias e Anexos Relacionados ({media.length})
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {media.map((item) => (
              <div
                key={item.id}
                className="group relative rounded-xl overflow-hidden border border-outline-variant bg-surface-container-lowest cursor-pointer aspect-square"
                onClick={() => item.url && setSelectedImage(item.url)}
              >
                {item.media_type === 'image' && item.url ? (
                  <img
                    src={item.url}
                    alt={item.caption || 'Mídia do documento'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center text-outline">
                    <FileText className="w-8 h-8 mb-2 text-terracotta" />
                    <span className="text-[11px] font-mono">{item.caption || item.media_type}</span>
                  </div>
                )}
                {item.caption && (
                  <div className="absolute inset-x-0 bottom-0 bg-black/75 p-1.5 text-[10px] text-on-surface-variant truncate">
                    {item.caption}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Image Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setSelectedImage(null)}
        >
          <img
            src={selectedImage}
            alt="Ampliação da imagem"
            className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
          />
        </div>
      )}
    </div>
  )
}
