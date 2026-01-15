export const runtime = 'edge'

import { getRequestContext } from '@cloudflare/next-on-pages'

import { createAuth } from '@/lib/auth-runtime'

function sanitizeSlug(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
    .slice(0, 48)
}

export async function GET(request: Request) {
  const auth = createAuth()
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { env } = getRequestContext()
  const servers = await env.DB.prepare(
    'SELECT id, slug, name, upstream_base_url, enabled, created_at, updated_at FROM mcp_servers WHERE user_id = ? ORDER BY created_at DESC'
  )
    .bind(session.user.id)
    .all()

  return Response.json({ servers: servers.results })
}

function normalizeUpstreamBaseUrl(input: string) {
  return input.trim().replace(/\/$/, '')
}

function isHttpsUrl(value: string) {
  return /^https:\/\//.test(value)
}

async function ensureGatewayUser(env: any, session: any) {
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

  const name = typeof (body as any)?.name === 'string' ? (body as any).name.trim() : ''
  const upstream_base_url =
    typeof (body as any)?.upstream_base_url === 'string'
      ? normalizeUpstreamBaseUrl((body as any).upstream_base_url)
      : ''

  const requestedSlugRaw = typeof (body as any)?.slug === 'string' ? (body as any).slug : ''
  const slug = sanitizeSlug(requestedSlugRaw || name)

  if (!name) {
    return Response.json({ error: 'Name is required' }, { status: 400 })
  }

  if (!slug) {
    return Response.json({ error: 'Slug is required' }, { status: 400 })
  }

  if (!upstream_base_url || !isHttpsUrl(upstream_base_url)) {
    return Response.json({ error: 'Upstream base URL must be https' }, { status: 400 })
  }

  await ensureGatewayUser(env, session)

  const id = crypto.randomUUID()

  try {
    await env.DB.prepare(
      'INSERT INTO mcp_servers (id, user_id, slug, name, upstream_base_url, enabled) VALUES (?, ?, ?, ?, ?, ?)'
    )
      .bind(id, session.user.id, slug, name, upstream_base_url, 1)
      .run()
  } catch {
    return Response.json(
      { error: 'Slug already exists. Pick another.' },
      { status: 409 }
    )
  }

  return Response.json(
    {
      id,
      slug,
      name,
      upstream_base_url,
      enabled: 1,
      url: `https://makethe.app/mcp/${slug}`,
    },
    { status: 201 }
  )
}

export async function PATCH(request: Request) {
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

  const id = typeof (body as any)?.id === 'string' ? (body as any).id : ''
  if (!id) {
    return Response.json({ error: 'id is required' }, { status: 400 })
  }

  const existing = await env.DB.prepare(
    'SELECT id, slug, name, upstream_base_url, enabled FROM mcp_servers WHERE id = ? AND user_id = ?'
  )
    .bind(id, session.user.id)
    .first()

  if (!existing) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  const name = typeof (body as any)?.name === 'string' ? (body as any).name.trim() : null
  const requestedSlugRaw = typeof (body as any)?.slug === 'string' ? (body as any).slug : null
  const slug = typeof requestedSlugRaw === 'string' ? sanitizeSlug(requestedSlugRaw) : null
  const upstream_base_url =
    typeof (body as any)?.upstream_base_url === 'string'
      ? normalizeUpstreamBaseUrl((body as any).upstream_base_url)
      : null
  const enabled =
    typeof (body as any)?.enabled === 'boolean' ? ((body as any).enabled ? 1 : 0)
    : typeof (body as any)?.enabled === 'number' ? ((body as any).enabled ? 1 : 0)
    : null

  if (slug !== null && !slug) {
    return Response.json({ error: 'Invalid slug' }, { status: 400 })
  }

  if (upstream_base_url !== null && (!upstream_base_url || !isHttpsUrl(upstream_base_url))) {
    return Response.json({ error: 'Upstream base URL must be https' }, { status: 400 })
  }

  await ensureGatewayUser(env, session)

  try {
    await env.DB.prepare(
      `UPDATE mcp_servers
       SET slug = COALESCE(?, slug),
           name = COALESCE(?, name),
           upstream_base_url = COALESCE(?, upstream_base_url),
           enabled = COALESCE(?, enabled),
           updated_at = datetime('now')
       WHERE id = ? AND user_id = ?`
    )
      .bind(slug, name, upstream_base_url, enabled, id, session.user.id)
      .run()
  } catch {
    return Response.json({ error: 'Slug already exists. Pick another.' }, { status: 409 })
  }

  const updated = await env.DB.prepare(
    'SELECT id, slug, name, upstream_base_url, enabled, created_at, updated_at FROM mcp_servers WHERE id = ? AND user_id = ?'
  )
    .bind(id, session.user.id)
    .first()

  return Response.json({ server: updated, url: `https://makethe.app/mcp/${(updated as any).slug}` })
}

export async function DELETE(request: Request) {
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

  const id = typeof (body as any)?.id === 'string' ? (body as any).id : ''
  if (!id) {
    return Response.json({ error: 'id is required' }, { status: 400 })
  }

  const res = await env.DB.prepare('DELETE FROM mcp_servers WHERE id = ? AND user_id = ?')
    .bind(id, session.user.id)
    .run()

  const deleted = (res as any)?.meta?.changes ? Number((res as any).meta.changes) : 0
  if (!deleted) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  return Response.json({ ok: true })
}
