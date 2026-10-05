import type { KVNamespace } from '@cloudflare/workers-types'

export class CacheService {
  constructor(private kv?: KVNamespace) {}

  async get<T>(key: string): Promise<T | null> {
    if (!this.kv) return null
    try {
      const data = await this.kv.get(key, 'json')
      return data as T
    } catch (err) {
      console.warn(`[KV Cache Miss/Error] Key: ${key}`, err)
      return null
    }
  }

  async set(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
    if (!this.kv) return
    try {
      await this.kv.put(key, JSON.stringify(value), { expirationTtl: ttlSeconds })
    } catch (err) {
      console.warn(`[KV Cache Put Error] Key: ${key}`, err)
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.kv) return
    try {
      await this.kv.delete(key)
    } catch (err) {
      console.warn(`[KV Cache Delete Error] Key: ${key}`, err)
    }
  }

  async invalidatePrefix(prefix: string): Promise<void> {
    if (!this.kv) return
    try {
      const list = await this.kv.list({ prefix })
      for (const key of list.keys) {
        await this.kv.delete(key.name)
      }
    } catch (err) {
      console.warn(`[KV Invalidate Error] Prefix: ${prefix}`, err)
    }
  }
}
