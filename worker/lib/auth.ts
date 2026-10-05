import { Context, Next } from 'hono'
import type { Env } from '../index'

export async function authMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const authHeader = c.req.header('Authorization')
  
  if (!authHeader) {
    return c.json({ error: 'Autorização necessária. Cabeçalho Authorization ausente.' }, 401)
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  const secret = c.env.ADMIN_SECRET || 'acervo-super-secret-key-2026'

  if (token !== secret) {
    return c.json({ error: 'Credenciais inválidas ou token expirado.' }, 401)
  }

  await next()
}
