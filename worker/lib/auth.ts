import { Context, Next } from 'hono'
import type { Env } from '../index'

const SESSION_MS = 12 * 60 * 60 * 1000
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 8

export function adminSecret(env: Env): string | null {
  const secret = env.ADMIN_SECRET?.trim()
  return secret ? secret : null
}

export async function passwordsMatch(left: string, right: string): Promise<boolean> {
  const leftDigest = await sha256(left)
  const rightDigest = await sha256(right)
  return bytesEqual(leftDigest, rightDigest)
}

export async function signSession(secret: string): Promise<{ token: string; expires_at: number }> {
  const expiresAt = Date.now() + SESSION_MS
  const payload = bytesToBase64Url(new TextEncoder().encode(JSON.stringify({ v: 1, exp: expiresAt })))
  const signature = await hmac(secret, payload)
  return { token: `${payload}.${bytesToBase64Url(signature)}`, expires_at: expiresAt }
}

export async function verifySession(token: string, secret: string): Promise<boolean> {
  const parts = token.split('.')
  if (parts.length !== 2 || !parts[0] || !parts[1]) return false
  const expected = await hmac(secret, parts[0])
  let provided: Uint8Array
  try {
    provided = base64UrlToBytes(parts[1])
  } catch {
    return false
  }
  if (!bytesEqual(expected, provided)) return false
  try {
    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(parts[0]))) as { exp?: number }
    return typeof payload.exp === 'number' && payload.exp > Date.now()
  } catch {
    return false
  }
}

export async function authMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const secret = adminSecret(c.env)
  if (!secret) {
    return c.json({ error: 'O painel administrativo não está disponível.' }, 503)
  }

  const header = c.req.header('Authorization')
  const token = header?.replace(/^Bearer\s+/i, '').trim() || ''
  if (!token || !(await verifySession(token, secret))) {
    return c.json({ error: 'Credenciais inválidas ou token expirado.' }, 401)
  }

  await next()
}

export function clientAddress(c: Context): string {
  const forwarded = c.req.header('CF-Connecting-IP') || c.req.header('x-forwarded-for') || ''
  return forwarded.split(',')[0]?.trim() || 'local'
}

export async function attemptsExceeded(env: Env, address: string): Promise<boolean> {
  const current = await readAttempts(env, address)
  return current.count >= MAX_ATTEMPTS && current.resetAt > Date.now()
}

export async function recordFailedAttempt(env: Env, address: string): Promise<void> {
  if (!env.CACHE) return
  const now = Date.now()
  const current = await readAttempts(env, address)
  const fresh = current.resetAt <= now
  const next = {
    count: (fresh ? 0 : current.count) + 1,
    resetAt: fresh ? now + ATTEMPT_WINDOW_MS : current.resetAt,
  }
  await env.CACHE.put(`admin-auth:${address}`, JSON.stringify(next), { expirationTtl: ATTEMPT_WINDOW_MS / 1000 })
}

export async function clearAttempts(env: Env, address: string): Promise<void> {
  if (!env.CACHE) return
  await env.CACHE.delete(`admin-auth:${address}`)
}

async function readAttempts(env: Env, address: string): Promise<{ count: number; resetAt: number }> {
  if (!env.CACHE) return { count: 0, resetAt: 0 }
  const raw = await env.CACHE.get(`admin-auth:${address}`)
  if (!raw) return { count: 0, resetAt: 0 }
  try {
    const parsed = JSON.parse(raw) as { count?: number; resetAt?: number }
    return {
      count: typeof parsed.count === 'number' ? parsed.count : 0,
      resetAt: typeof parsed.resetAt === 'number' ? parsed.resetAt : 0,
    }
  } catch {
    return { count: 0, resetAt: 0 }
  }
}

async function sha256(value: string): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return new Uint8Array(digest)
}

async function hmac(secret: string, value: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value))
  return new Uint8Array(signature)
}

function bytesEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false
  let diff = 0
  for (let index = 0; index < left.length; index += 1) {
    diff |= left[index] ^ right[index]
  }
  return diff === 0
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/')
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4))
  const binary = atob(padded + pad)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}
