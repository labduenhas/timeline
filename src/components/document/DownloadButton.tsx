import React from 'react'
import { Download, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface DownloadButtonProps {
  url?: string | null
  filename?: string
  className?: string
}

export function DownloadButton({ url, filename = 'documento', className }: DownloadButtonProps) {
  if (!url) return null

  const isExternal = url.startsWith('http') && !url.includes(window.location.host)

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      download={filename}
      className={className}
    >
      <Button variant="secondary" size="sm" className="gap-2">
        {isExternal ? (
          <>
            <ExternalLink className="w-4 h-4" />
            <span>Acessar Arquivo Original</span>
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            <span>Baixar Arquivo Digital</span>
          </>
        )}
      </Button>
    </a>
  )
}
