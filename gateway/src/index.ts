import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { streamSSE } from 'hono/streaming'
import { createTraceContext, extractTraceHeaders, TraceContext } from './trace'
import { routeModelRequest, ModelRequest } from './routing'
import { writeAnalyticsEvent } from './analytics'
import {
  MCPMessage,
  GATEWAY_TOOLS,
  createInitializeResponse,
  createToolsListResponse,
  createErrorResponse,
  createToolResultResponse,
} from './mcp'

type Bindings = {
  DB: D1Database
  TRACES: R2Bucket
  ASSETS: R2Bucket
  ANALYTICS: AnalyticsEngineDataset
  ENVIRONMENT: string
}

type Variables = {
  userId: string | null
  traceCtx: TraceContext
  mcpServerId: string | null
  accessUserId: string | null
}

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// Middleware
app.use('*', cors({
  origin: ['https://makethe.app', 'https://*.makethe.app'],
  credentials: true,
}))
app.use('*', logger())

// Trace context middleware
app.use('*', async (c, next) => {
  const traceHeaders = extractTraceHeaders(c.req.raw.headers)
  const traceCtx = createTraceContext(traceHeaders)
  c.set('traceCtx', traceCtx)
  c.set('mcpServerId', null)
  c.set('accessUserId', null)
  c.header('traceparent', traceCtx.traceparent)
  await next()
})

// Auth middleware for protected routes
const authMiddleware = async (c: any, next: () => Promise<void>) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const keyPrefix = authHeader.slice(7, 15)
  const keyFull = authHeader.slice(7)

  // Hash the key for comparison
  const encoder = new TextEncoder()
  const data = encoder.encode(keyFull)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const keyHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')

  const result = await c.env.DB.prepare(
    'SELECT user_id FROM api_keys WHERE key_prefix = ? AND key_hash = ?'
  )
    .bind(keyPrefix, keyHash)
    .first()

  if (!result) {
    return c.json({ error: 'Invalid API key' }, 401)
  }

  // Update last used
  await c.env.DB.prepare(
    "UPDATE api_keys SET last_used_at = datetime('now') WHERE key_prefix = ? AND key_hash = ?"
  )
    .bind(keyPrefix, keyHash)
    .run()

  c.set('userId', result.user_id as string)
  await next()
}

const cloudflareAccessMiddleware = async (c: any, next: () => Promise<void>) => {
  const emailHeader = c.req.header('CF-Access-Authenticated-User-Email')
  if (!emailHeader) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const email = emailHeader.trim().toLowerCase()
  if (!email || !email.includes('@')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const user = await c.env.DB.prepare('SELECT id FROM users WHERE lower(email) = lower(?)')
    .bind(email)
    .first()

  if (!user || !(user as any).id) {
    return c.json({ error: 'User not found' }, 404)
  }

  c.set('accessUserId', (user as any).id)
  await next()
}

// Health check
app.get('/', (c) => {
  const accept = c.req.header('Accept') || ''
  if (accept.includes('text/html')) {
    return c.redirect('https://makethe.app/docs', 302)
  }

  return c.json({
    status: 'ok',
    service: 'mcp-gateway',
    version: '1.0.0',
  })
})

app.get('/health', (c) => c.json({ status: 'healthy' }))

// Basic upstream connectivity test for a registered MCP server.
// Protected by Cloudflare Access.
app.get('/mcp/:slug/test', cloudflareAccessMiddleware, async (c) => {
  const slug = sanitizeSlug(c.req.param('slug'))
  const accessUserId = c.get('accessUserId')

  const server = await getMcpServerBySlug(slug, c.env)
  if (!server || server.user_id !== accessUserId) {
    return c.json({ ok: false, error: 'MCP server not found' }, 404)
  }

  if (!server.enabled) {
    return c.json({ ok: false, error: 'MCP server disabled' }, 403)
  }

  const upstream = normalizeBaseUrl(server.upstream_base_url)
  const id = crypto.randomUUID()

  const startedAt = Date.now()
  let status: number | null = null
  let jsonrpcOk = false
  let toolCount: number | null = null
  let error: string | null = null

  try {
    const res = await fetch(`${upstream}/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id,
        method: 'tools/list',
        params: {},
      }),
    })

    status = res.status
    const text = await res.text()

    let parsed: any = null
    try {
      parsed = text ? JSON.parse(text) : null
    } catch {
      parsed = null
    }

    jsonrpcOk = Boolean(parsed && parsed.jsonrpc === '2.0')

    if (parsed?.error) {
      error = typeof parsed.error?.message === 'string' ? parsed.error.message : 'Upstream error'
    } else if (Array.isArray(parsed?.result?.tools)) {
      toolCount = parsed.result.tools.length
    } else if (!res.ok) {
      error = `Upstream error (${res.status})`
    }
  } catch (err) {
    error = err instanceof Error ? err.message : 'Upstream request failed'
  }

  const durationMs = Date.now() - startedAt

  return c.json({
    ok: !error && status !== null && status >= 200 && status < 300 && jsonrpcOk,
    slug: server.slug,
    upstream: server.upstream_base_url,
    status,
    jsonrpcOk,
    toolCount,
    durationMs,
    error,
  })
})

// Public: private beta access requests
app.post('/v1/waitlist', async (c) => {
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    body = null
  }

  const email = (body as any)?.email
  const source = (body as any)?.source

  if (typeof email !== 'string') {
    return c.json({ error: 'Email is required' }, 400)
  }

  const normalized = email.trim().toLowerCase()
  if (!normalized || normalized.length > 320 || !normalized.includes('@')) {
    return c.json({ error: 'Invalid email' }, 400)
  }

  await c.env.DB.prepare(
    'INSERT OR IGNORE INTO waitlist (id, email, source) VALUES (?, ?, ?)'
  )
    .bind(crypto.randomUUID(), normalized, typeof source === 'string' ? source : null)
    .run()

  return c.json({ ok: true })
})

// ============ MCP Server URLs (makethe.app) ============

function sanitizeSlug(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
}

// Cloudflare Access-protected MCP endpoint
// GET /mcp/:slug/sse opens SSE and returns /mcp/:slug/message endpoint
app.get('/mcp/:slug/sse', cloudflareAccessMiddleware, async (c) => {
  const slug = sanitizeSlug(c.req.param('slug'))

  const server = await c.env.DB.prepare(
    'SELECT id, user_id, enabled FROM mcp_servers WHERE slug = ?'
  )
    .bind(slug)
    .first()

  if (!server || !(server as any).id) {
    return c.json({ error: 'MCP server not found' }, 404)
  }

  if (!(server as any).enabled) {
    return c.json({ error: 'MCP server disabled' }, 403)
  }

  if ((server as any).user_id !== c.get('accessUserId')) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  c.set('mcpServerId', (server as any).id as string)
  return app.fetch(c.req.raw, c.env)
})

// Cloudflare Access-protected message endpoint
app.post('/mcp/:serverId/message', cloudflareAccessMiddleware, async (c) => {
  const serverId = c.req.param('serverId')

  const server = await c.env.DB.prepare(
    'SELECT id, user_id, enabled FROM mcp_servers WHERE id = ?'
  )
    .bind(serverId)
    .first()

  if (!server || !(server as any).id) {
    return c.json({ error: 'MCP server not found' }, 404)
  }

  if (!(server as any).enabled) {
    return c.json({ error: 'MCP server disabled' }, 403)
  }

  if ((server as any).user_id !== c.get('accessUserId')) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  c.set('mcpServerId', (server as any).id as string)
  return app.fetch(c.req.raw, c.env)
})

// ============ MCP SSE Transport ============

// Store for active SSE connections and their message queues
const sseConnections = new Map<string, {
  userId: string
  sendMessage: (msg: MCPMessage) => void
}>()

// SSE endpoint - establishes connection and sends endpoint info
//
// Supports both:
// - Public gateway SSE:   GET /sse?api_key=mk_...
// - Per-server SSE URL:   GET /mcp/:slug/sse (Cloudflare Access protected)
app.get('/sse', async (c) => {

  // Auth via query param for SSE (can't use headers easily)
  // For Cloudflare Access protected per-server SSE, use /mcp/:slug/sse.
  const apiKey = c.req.query('api_key')
  if (!apiKey) {
    return c.json({ error: 'API key required as query parameter' }, 401)
  }

  const keyPrefix = apiKey.slice(0, 8)
  const encoder = new TextEncoder()
  const data = encoder.encode(apiKey)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const keyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

  const result = await c.env.DB.prepare(
    'SELECT user_id FROM api_keys WHERE key_prefix = ? AND key_hash = ?'
  ).bind(keyPrefix, keyHash).first()

  if (!result) {
    return c.json({ error: 'Invalid API key' }, 401)
  }

  const userId = result.user_id as string
  const sessionId = crypto.randomUUID()

  return streamSSE(c, async (stream) => {
    // Send endpoint message first
    const mcpServerId = c.get('mcpServerId')
    const messageEndpoint = mcpServerId
      ? `https://api.makethe.app/mcp/${mcpServerId}/message?session_id=${sessionId}`
      : `https://api.makethe.app/message?session_id=${sessionId}`

    const endpointMsg = {
      jsonrpc: '2.0',
      method: 'endpoint',
      params: {
        endpoint: messageEndpoint,
      },
    }
    await stream.writeSSE({ data: JSON.stringify(endpointMsg) })

    // Register connection
    sseConnections.set(sessionId, {
      userId,
      sendMessage: async (msg: MCPMessage) => {
        await stream.writeSSE({ data: JSON.stringify(msg) })
      },
    })

    // Keep connection alive
    const keepAlive = setInterval(async () => {
      try {
        await stream.writeSSE({ data: '' })
      } catch {
        clearInterval(keepAlive)
      }
    }, 30000)

    // Wait for abort
    stream.onAbort(() => {
      clearInterval(keepAlive)
      sseConnections.delete(sessionId)
    })

    // Keep stream open
    await new Promise(() => {})
  })
})

// Message endpoint - receives JSON-RPC messages from client
//
// Supports both:
// - Public gateway: POST /message?session_id=...
// - Per-server:     POST /mcp/:slug/message?session_id=...
app.post('/message', async (c) => {
  const sessionId = c.req.query('session_id')
  if (!sessionId) {
    return c.json({ error: 'session_id required' }, 400)
  }

  const connection = sseConnections.get(sessionId)
  if (!connection) {
    return c.json({ error: 'Session not found or expired' }, 404)
  }

  const message = await c.req.json() as MCPMessage
  const { userId, sendMessage } = connection
  const mcpServerId = c.get('mcpServerId')

  if (mcpServerId) {
    const accessUserId = c.get('accessUserId')
    if (!accessUserId || accessUserId !== userId) {
      return c.json({ error: 'Forbidden' }, 403)
    }
  }

  try {
    let response: MCPMessage

    switch (message.method) {
      case 'initialize':
        response = createInitializeResponse(message.id!)
        break

      case 'initialized':
        // No response needed for notification
        return c.json({ ok: true })

       case 'tools/list':
         if (mcpServerId) {
           response = await proxyMcpRequest(mcpServerId, userId, message, c.env)
         } else {
           response = createToolsListResponse(message.id!)
         }
         break


       case 'tools/call': {
         if (mcpServerId) {
           response = await proxyMcpRequest(mcpServerId, userId, message, c.env)
           break
         }

         const toolName = (message.params as any)?.name
         const toolArgs = (message.params as any)?.arguments || {}
         response = await handleToolCall(userId, toolName, toolArgs, message.id!, c.env)
         break
       }


      case 'ping':
        response = { jsonrpc: '2.0', id: message.id, result: {} }
        break

      default:
        response = createErrorResponse(message.id ?? null, -32601, `Method not found: ${message.method}`)
    }

    // Send response via SSE
    await sendMessage(response)
    return c.json({ ok: true })
  } catch (error) {
    const errorResponse = createErrorResponse(
      message.id ?? null,
      -32603,
      error instanceof Error ? error.message : 'Internal error'
    )
    await sendMessage(errorResponse)
    return c.json({ ok: true })
  }
})

type McpServerRow = {
  id: string
  user_id: string
  slug: string
  name: string
  upstream_base_url: string
  enabled: number
}

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/$/, '')
}

async function getMcpServerById(serverId: string, env: any): Promise<McpServerRow | null> {
  const row = await env.DB.prepare(
    'SELECT id, user_id, slug, name, upstream_base_url, enabled FROM mcp_servers WHERE id = ?'
  )
    .bind(serverId)
    .first()

  return row ? (row as any as McpServerRow) : null
}

async function getMcpServerBySlug(slug: string, env: any): Promise<McpServerRow | null> {
  const row = await env.DB.prepare(
    'SELECT id, user_id, slug, name, upstream_base_url, enabled FROM mcp_servers WHERE slug = ?'
  )
    .bind(slug)
    .first()

  return row ? (row as any as McpServerRow) : null
}

async function proxyMcpRequest(
  serverId: string,
  userId: string,
  message: MCPMessage,
  env: any
): Promise<MCPMessage> {
  const server = await getMcpServerById(serverId, env)
  if (!server || server.user_id !== userId || !server.enabled) {
    return createErrorResponse(message.id ?? null, 404, 'MCP server not found')
  }

  const upstream = normalizeBaseUrl(server.upstream_base_url)

  const res = await fetch(`${upstream}/message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(message),
  })

  let parsed: unknown
  const text = await res.text()
  try {
    parsed = text ? JSON.parse(text) : null
  } catch {
    parsed = null
  }

  if (!res.ok) {
    return createErrorResponse(
      message.id ?? null,
      res.status,
      typeof parsed === 'object' && parsed && 'error' in (parsed as any)
        ? String((parsed as any).error)
        : `Upstream error (${res.status})`
    )
  }

  if (parsed && typeof parsed === 'object' && (parsed as any).jsonrpc === '2.0') {
    return parsed as MCPMessage
  }

  return createErrorResponse(message.id ?? null, -32603, 'Invalid upstream MCP response')
}

// Handle tool calls
async function handleToolCall(
  userId: string,
  toolName: string,
  args: Record<string, unknown>,
  id: string | number,
  env: any
): Promise<MCPMessage> {
  try {
    let result: unknown

    switch (toolName) {
      case 'get_user_profile': {
        const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first()
        result = { user }
        break
      }

      case 'list_projects': {
        const projects = await env.DB.prepare(
          'SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC'
        ).bind(userId).all()
        result = { projects: projects.results }
        break
      }

      case 'create_project': {
        const projectId = crypto.randomUUID()
        await env.DB.prepare(
          'INSERT INTO projects (id, user_id, name, description, is_public) VALUES (?, ?, ?, ?, ?)'
        ).bind(
          projectId,
          userId,
          args.name as string,
          (args.description as string) || null,
          args.is_public ? 1 : 0
        ).run()
        result = { id: projectId, name: args.name, description: args.description }
        break
      }

      case 'get_usage': {
        const budget = await env.DB.prepare('SELECT * FROM cost_budgets WHERE user_id = ?').bind(userId).first()
        const traces = await env.DB.prepare(
          `SELECT tool_name, model, SUM(tokens_in) as total_tokens_in, SUM(tokens_out) as total_tokens_out, 
           SUM(cost_cents) as total_cost, COUNT(*) as request_count
           FROM traces WHERE user_id = ? AND created_at > datetime('now', '-30 days')
           GROUP BY tool_name, model`
        ).bind(userId).all()
        result = { budget, usage: traces.results }
        break
      }

      case 'list_api_keys': {
        const keys = await env.DB.prepare(
          'SELECT id, name, key_prefix, last_used_at, expires_at, created_at FROM api_keys WHERE user_id = ?'
        ).bind(userId).all()
        result = { keys: keys.results }
        break
      }

      case 'create_api_key': {
        const keyId = crypto.randomUUID()
        const keyBytes = new Uint8Array(32)
        crypto.getRandomValues(keyBytes)
        const apiKey = 'mk_' + Array.from(keyBytes).map(b => b.toString(16).padStart(2, '0')).join('')
        const keyPrefix = apiKey.slice(0, 8)

        const encoder = new TextEncoder()
        const data = encoder.encode(apiKey)
        const hashBuffer = await crypto.subtle.digest('SHA-256', data)
        const hashArray = Array.from(new Uint8Array(hashBuffer))
        const keyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

        await env.DB.prepare(
          'INSERT INTO api_keys (id, user_id, name, key_hash, key_prefix) VALUES (?, ?, ?, ?, ?)'
        ).bind(keyId, userId, args.name as string, keyHash, keyPrefix).run()

        result = { id: keyId, name: args.name, key: apiKey, key_prefix: keyPrefix }
        break
      }

      case 'list_adapters': {
        const adapters = await env.DB.prepare(
          'SELECT * FROM lora_adapters WHERE user_id = ? ORDER BY created_at DESC'
        ).bind(userId).all()
        result = { adapters: adapters.results }
        break
      }

      case 'route_model_request': {
        const routingResult = await routeModelRequest(
          args as ModelRequest,
          userId,
          env.DB
        )
        result = {
          routing: routingResult,
          note: 'This is routing metadata. Actual model calls should be made to the target endpoint.',
        }
        break
      }

      default:
        return createErrorResponse(id, -32601, `Unknown tool: ${toolName}`)
    }

    return createToolResultResponse(id, result)
  } catch (error) {
    return createToolResultResponse(
      id,
      { error: error instanceof Error ? error.message : 'Tool execution failed' },
      true
    )
  }
}

// ============ MCP Gateway Routes ============

// Proxy MCP requests with tracing and routing
//
// Mixed-mode behavior:
// - If `:tool` matches a gateway tool, execute it against the gateway DB.
// - Otherwise, treat this as an LLM request and return routing metadata
//   (until provider proxying is implemented).
app.post('/v1/mcp/:tool', authMiddleware, async (c) => {
  const startTime = Date.now()
  const tool = c.req.param('tool')
  const userId = c.get('userId')!
  const traceCtx = c.get('traceCtx')

  const isGatewayTool = GATEWAY_TOOLS.some((t) => t.name === tool)

  try {
    const body = await c.req.json()

    if (isGatewayTool) {
      const mcpResponse = await handleToolCall(userId, tool, body as Record<string, unknown>, crypto.randomUUID(), c.env)
      const duration = Date.now() - startTime

      writeAnalyticsEvent(c.env.ANALYTICS, {
        traceId: traceCtx.traceId,
        userId,
        tool,
        model: 'gateway',
        tokensIn: typeof body === 'string' ? body.length : JSON.stringify(body).length,
        tokensOut: JSON.stringify(mcpResponse).length,
        durationMs: duration,
        status: 'success',
      })

      await c.env.TRACES.put(
        `traces/${userId}/${traceCtx.traceId}.json`,
        JSON.stringify({
          ...traceCtx,
          kind: 'gateway_tool',
          tool,
          request: body,
          response: mcpResponse,
          duration,
          timestamp: new Date().toISOString(),
        })
      )

      await c.env.DB.prepare(
        'INSERT INTO traces (id, user_id, trace_id, tool_name, model, tokens_in, tokens_out, duration_ms, cost_cents, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      )
        .bind(
          crypto.randomUUID(),
          userId,
          traceCtx.traceId,
          tool,
          'gateway',
          typeof body === 'string' ? body.length : JSON.stringify(body).length,
          JSON.stringify(mcpResponse).length,
          duration,
          0,
          'success'
        )
        .run()

      return c.json(mcpResponse)
    }

    const modelRequest = body as ModelRequest

    // Route to appropriate model/endpoint
    const routingResult = await routeModelRequest(modelRequest, userId, c.env.DB)

    // Not yet proxying to providers; return routing metadata for now.
    const response = {
      id: crypto.randomUUID(),
      tool,
      routing: routingResult,
      trace_id: traceCtx.traceId,
      note: 'Provider proxying not enabled yet; this is routing metadata only.',
    }

    const duration = Date.now() - startTime
    const analyticsStatus = routingResult.rateLimited
      ? 'error'
      : routingResult.cacheHit
        ? 'cached'
        : 'success'

    writeAnalyticsEvent(c.env.ANALYTICS, {
      traceId: traceCtx.traceId,
      userId,
      tool,
      model: modelRequest.model || 'default',
      tokensIn:
        modelRequest.messages?.reduce((acc: number, m: any) => acc + (m.content?.length || 0), 0) ||
        0,
      tokensOut: JSON.stringify(response).length,
      durationMs: duration,
      status: analyticsStatus,
      costCents: routingResult.estimatedCost,
    })

    // Store trace in R2 for long-term storage
    await c.env.TRACES.put(
      `traces/${userId}/${traceCtx.traceId}.json`,
      JSON.stringify({
        ...traceCtx,
        kind: 'model_route',
        request: modelRequest,
        response,
        duration,
        timestamp: new Date().toISOString(),
      })
    )

    await c.env.DB.prepare(
      'INSERT INTO traces (id, user_id, trace_id, tool_name, model, tokens_in, tokens_out, duration_ms, cost_cents, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
      .bind(
        crypto.randomUUID(),
        userId,
        traceCtx.traceId,
        tool,
        routingResult.targetModel,
        modelRequest.messages?.reduce((acc: number, m: any) => acc + (m.content?.length || 0), 0) || 0,
        JSON.stringify(response).length,
        duration,
        routingResult.estimatedCost,
        routingResult.rateLimited ? 'rate_limited' : routingResult.cacheHit ? 'cached' : 'success'
      )
      .run()

    if (!routingResult.rateLimited && !routingResult.cacheHit && routingResult.estimatedCost > 0) {
      await c.env.DB.prepare(
        "UPDATE cost_budgets SET current_usage_cents = current_usage_cents + ?, updated_at = datetime('now') WHERE user_id = ?"
      )
        .bind(routingResult.estimatedCost, userId)
        .run()
    }

    return c.json(response, routingResult.rateLimited ? 429 : 200)
  } catch (error) {
    const duration = Date.now() - startTime

    writeAnalyticsEvent(c.env.ANALYTICS, {
      traceId: traceCtx.traceId,
      userId: userId || 'anonymous',
      tool,
      model: 'unknown',
      tokensIn: 0,
      tokensOut: 0,
      durationMs: duration,
      status: 'error',
    })

    return c.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
        trace_id: traceCtx.traceId,
      },
      500
    )
  }
})

// ============ User Routes ============

app.get('/v1/users/:username', async (c) => {
  const username = c.req.param('username')
  
  const user = await c.env.DB.prepare(
    'SELECT id, username, display_name, avatar_url, created_at FROM users WHERE username = ?'
  ).bind(username).first()
  
  if (!user) {
    return c.json({ error: 'User not found' }, 404)
  }
  
  const projects = await c.env.DB.prepare(
    'SELECT id, name, description, created_at FROM projects WHERE user_id = ? AND is_public = 1'
  ).bind(user.id).all()
  
  return c.json({ user, projects: projects.results })
})

app.get('/v1/me', authMiddleware, async (c) => {
  const userId = c.get('userId')!
  
  const user = await c.env.DB.prepare(
    'SELECT * FROM users WHERE id = ?'
  ).bind(userId).first()
  
  return c.json({ user })
})

app.put('/v1/me', authMiddleware, async (c) => {
  const userId = c.get('userId')!
  const body = await c.req.json()
  
  await c.env.DB.prepare(
    "UPDATE users SET display_name = ?, avatar_url = ?, updated_at = datetime('now') WHERE id = ?"
  ).bind(body.display_name, body.avatar_url, userId).run()
  
  return c.json({ success: true })
})

// ============ Project Routes ============

app.get('/v1/projects', authMiddleware, async (c) => {
  const userId = c.get('userId')!
  
  const projects = await c.env.DB.prepare(
    'SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC'
  ).bind(userId).all()
  
  return c.json({ projects: projects.results })
})

app.post('/v1/projects', authMiddleware, async (c) => {
  const userId = c.get('userId')!
  const body = await c.req.json()
  const id = crypto.randomUUID()
  
  await c.env.DB.prepare(
    'INSERT INTO projects (id, user_id, name, description, is_public) VALUES (?, ?, ?, ?, ?)'
  ).bind(id, userId, body.name, body.description, body.is_public ? 1 : 0).run()
  
  return c.json({ id, ...body }, 201)
})

// ============ API Key Routes ============

app.get('/v1/api-keys', authMiddleware, async (c) => {
  const userId = c.get('userId')!
  
  const keys = await c.env.DB.prepare(
    'SELECT id, name, key_prefix, last_used_at, expires_at, created_at FROM api_keys WHERE user_id = ?'
  ).bind(userId).all()
  
  return c.json({ keys: keys.results })
})

app.post('/v1/api-keys', authMiddleware, async (c) => {
  const userId = c.get('userId')!
  const body = await c.req.json()
  
  // Generate API key
  const id = crypto.randomUUID()
  const keyBytes = new Uint8Array(32)
  crypto.getRandomValues(keyBytes)
  const apiKey = 'mk_' + Array.from(keyBytes).map(b => b.toString(16).padStart(2, '0')).join('')
  const keyPrefix = apiKey.slice(0, 8)
  
  // Hash the key
  const encoder = new TextEncoder()
  const data = encoder.encode(apiKey)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const keyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  
  await c.env.DB.prepare(
    'INSERT INTO api_keys (id, user_id, name, key_hash, key_prefix, expires_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(id, userId, body.name, keyHash, keyPrefix, body.expires_at || null).run()
  
  // Return the key only once
  return c.json({ id, name: body.name, key: apiKey, key_prefix: keyPrefix }, 201)
})

app.delete('/v1/api-keys/:id', authMiddleware, async (c) => {
  const userId = c.get('userId')!
  const keyId = c.req.param('id')
  
  await c.env.DB.prepare(
    'DELETE FROM api_keys WHERE id = ? AND user_id = ?'
  ).bind(keyId, userId).run()
  
  return c.json({ success: true })
})

// ============ Cost & Budget Routes ============

app.get('/v1/usage', authMiddleware, async (c) => {
  const userId = c.get('userId')!
  
  const budget = await c.env.DB.prepare(
    'SELECT * FROM cost_budgets WHERE user_id = ?'
  ).bind(userId).first()
  
  const recentTraces = await c.env.DB.prepare(
    `SELECT tool_name, model, SUM(tokens_in) as total_tokens_in, 
     SUM(tokens_out) as total_tokens_out, SUM(cost_cents) as total_cost,
     COUNT(*) as request_count
     FROM traces WHERE user_id = ? AND created_at > datetime('now', '-30 days')
     GROUP BY tool_name, model`
  ).bind(userId).all()
  
  return c.json({ budget, usage: recentTraces.results })
})

// ============ LoRA Adapter Routes ============

app.get('/v1/adapters', authMiddleware, async (c) => {
  const userId = c.get('userId')!
  
  const adapters = await c.env.DB.prepare(
    'SELECT * FROM lora_adapters WHERE user_id = ? ORDER BY created_at DESC'
  ).bind(userId).all()
  
  return c.json({ adapters: adapters.results })
})

app.post('/v1/adapters', authMiddleware, async (c) => {
  const userId = c.get('userId')!
  const body = await c.req.json()
  const id = crypto.randomUUID()
  const storagePath = `adapters/${userId}/${id}`
  
  await c.env.DB.prepare(
    'INSERT INTO lora_adapters (id, user_id, project_id, name, model_base, storage_path, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, userId, body.project_id || null, body.name, body.model_base, storagePath, JSON.stringify(body.metadata || {})).run()
  
  return c.json({ id, storage_path: storagePath }, 201)
})

// Asset upload endpoint
app.post('/v1/assets/:type', authMiddleware, async (c) => {
  const userId = c.get('userId')!
  const type = c.req.param('type')
  const file = await c.req.blob()
  
  const id = crypto.randomUUID()
  const path = `${type}/${userId}/${id}`
  
  await c.env.ASSETS.put(path, file)
  
  return c.json({ 
    path, 
    url: `https://assets.makethe.app/${path}` 
  }, 201)
})

export default app
