export const runtime = 'edge'

import { getRequestContext } from '@cloudflare/next-on-pages'

import { createAuth } from '@/lib/auth-runtime'

async function sha256Hex(input: string) {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

function generateApiKey() {
  const keyBytes = new Uint8Array(32)
  crypto.getRandomValues(keyBytes)
  return 'mk_' + Array.from(keyBytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function GET(request: Request) {
  const auth = createAuth()
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { env } = getRequestContext()

  const keys = await env.DB.prepare(
    'SELECT id, name, key_prefix, last_used_at, expires_at, created_at FROM api_keys WHERE user_id = ? ORDER BY created_at DESC'
  )
    .bind(session.user.id)
    .all()

  return Response.json({ keys: keys.results })
}

export async function POST(request: Request) {
  const auth = createAuth()
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { env } = getRequestContext()

  let body: unknown
  try {
    body = await request.json()
  } catch {
    body = null
  }

  const name = typeof (body as any)?.name === 'string' ? (body as any).name : 'Default'

  const apiKey = generateApiKey()
  const keyPrefix = apiKey.slice(0, 8)
  const keyHash = await sha256Hex(apiKey)

  const id = crypto.randomUUID()

  try {
    await env.DB.prepare(
      'INSERT INTO api_keys (id, user_id, name, key_hash, key_prefix) VALUES (?, ?, ?, ?, ?)'
    )
      .bind(id, session.user.id, name, keyHash, keyPrefix)
      .run()
  } catch (err) {
    // If the gateway users row didn't exist (e.g., old accounts), create it and retry.
    await env.DB.prepare(
      'INSERT OR IGNORE INTO users (id, username, email, display_name, avatar_url) VALUES (?, ?, ?, ?, ?)'
    )
      .bind(
        session.user.id,
        `user-${String(session.user.id).replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 8)}`,
        session.user.email,
        session.user.name || null,
        (session.user as any).image || null
      )
      .run()

    await env.DB.prepare(
      'INSERT INTO api_keys (id, user_id, name, key_hash, key_prefix) VALUES (?, ?, ?, ?, ?)'
    )
      .bind(id, session.user.id, name, keyHash, keyPrefix)
      .run()
  }

  return Response.json({ id, name, key: apiKey, key_prefix: keyPrefix }, { status: 201 })
}
