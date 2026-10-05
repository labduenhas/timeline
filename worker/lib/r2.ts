import type { R2Bucket } from '@cloudflare/workers-types'

export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'text/plain',
  'video/mp4',
  'video/webm',
  'audio/mpeg',
  'audio/ogg',
] as const

export const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB

export function isAllowedMimeType(type: string): boolean {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(type.toLowerCase())
}

export function generateFileKey(originalFilename: string, prefix = 'uploads'): string {
  const ext = originalFilename.split('.').pop()?.toLowerCase() || 'bin'
  const uuid = crypto.randomUUID()
  return `${prefix}/${uuid}.${ext}`
}

export function getPublicUrl(key: string | null | undefined, publicR2Url?: string): string | null {
  if (!key) return null
  if (key.startsWith('http://') || key.startsWith('https://')) return key
  const base = publicR2Url?.replace(/\/+$/, '') || 'https://acervo-files.r2.dev'
  return `${base}/${key.replace(/^\/+/, '')}`
}
