import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { DocType, DatePrecision } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString: string, precision: DatePrecision = 'day'): string {
  try {
    if (!dateString) return ''
    if (precision === 'year' || dateString.length === 4) {
      return dateString.substring(0, 4)
    }
    if (precision === 'month' || dateString.length === 7) {
      const parts = dateString.split('-')
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1)
      return format(d, 'MMM yyyy', { locale: ptBR })
    }
    const d = parseISO(dateString)
    return format(d, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
  } catch {
    return dateString
  }
}

export function formatYearOnly(dateString: string): string {
  if (!dateString) return ''
  return dateString.substring(0, 4)
}

export function formatViews(count: number): string {
  if (count >= 1000) {
    const value = count / 1000
    const digits = value >= 10 ? 0 : 1
    return `${value.toFixed(digits).replace('.', ',')}k`
  }
  return count.toLocaleString('pt-BR')
}

export function getTypeLabel(type: DocType): string {
  const map: Record<DocType, string> = {
    image: 'Fotografia / Imagem',
    pdf: 'Documento PDF',
    txt: 'Texto / Manuscrito',
    video_file: 'Vídeo Arquivado',
    video_url: 'Vídeo Externo',
    audio: 'Gravação de Áudio',
    document: 'Documento Oficial',
    link: 'Referência Web',
  }
  return map[type] || 'Item do Acervo'
}

export function getTypeIconEmoji(type: DocType): string {
  const map: Record<DocType, string> = {
    image: '🖼️',
    pdf: '📄',
    txt: '📝',
    video_file: '🎬',
    video_url: '▶️',
    audio: '🎵',
    document: '📋',
    link: '🔗',
  }
  return map[type] || '📁'
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (!+bytes) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}
