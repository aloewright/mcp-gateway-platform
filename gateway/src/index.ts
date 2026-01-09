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
  const keyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  
  const result = await c.env.DB.prepare(
    'SELECT user_id FROM api_keys WHERE key_prefix = ? AND key_hash = ?'
  ).bind(keyPrefix, keyHash).first()
  
  if (!result) {
    return c.json({ error: 'Invalid API key' }, 401)
  }
  
  // Update last used
  await c.env.DB.prepare(
    "UPDATE api_keys SET last_used_at = datetime('now') WHERE key_prefix = ? AND key_hash = ?"
  ).bind(keyPrefix, keyHash).run()
  
  c.set('userId', result.user_id as string)
  await next()
}

// Health check
app.get('/', (c) => {
  return c.json({ 
    status: 'ok', 
    service: 'mcp-gateway',
    version: '1.0.0'
  })
})

app.get('/health', (c) => c.json({ status: 'healthy' }))

// ============ MCP SSE Transport ============

// Store for active SSE connections and their message queues
const sseConnections = new Map<string, {
  userId: string
  sendMessage: (msg: MCPMessage) => void
}>()

// SSE endpoint - establishes connection and sends endpoint info
app.get('/sse', async (c) => {
  // Auth via query param for SSE (can't use headers easily)
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
    const endpointMsg = {
      jsonrpc: '2.0',
      method: 'endpoint',
      params: {
        endpoint: `https://api.makethe.app/message?session_id=${sessionId}`,
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
        response = createToolsListResponse(message.id!)
        break

      case 'tools/call':
        const toolName = (message.params as any)?.name
        const toolArgs = (message.params as any)?.arguments || {}
        response = await handleToolCall(userId, toolName, toolArgs, message.id!, c.env)
        break

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

      case 'list_mcp_servers': {
        const servers = await env.DB.prepare(
          'SELECT * FROM mcp_servers WHERE user_id = ? ORDER BY created_at DESC'
        ).bind(userId).all()
        result = { servers: servers.results }
        break
      }

      case 'create_mcp_server': {
        const mcpServerId = crypto.randomUUID()
        await env.DB.prepare(
          `INSERT INTO mcp_servers (id, user_id, name, description, transport_type,
           endpoint_url, command, args, env_vars, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          mcpServerId,
          userId,
          args.name as string,
          (args.description as string) || null,
          args.transport_type as string,
          (args.endpoint_url as string) || null,
          (args.command as string) || null,
          args.args ? JSON.stringify(args.args) : null,
          args.env_vars ? JSON.stringify(args.env_vars) : null,
          args.is_active !== undefined ? (args.is_active ? 1 : 0) : 1
        ).run()
        result = {
          id: mcpServerId,
          name: args.name,
          transport_type: args.transport_type,
          is_active: args.is_active !== undefined ? args.is_active : true
        }
        break
      }

      case 'delete_mcp_server': {
        await env.DB.prepare(
          'DELETE FROM mcp_servers WHERE id = ? AND user_id = ?'
        ).bind(args.server_id as string, userId).run()
        result = { success: true, deleted_id: args.server_id }
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
app.post('/v1/mcp/:tool', authMiddleware, async (c) => {
  const startTime = Date.now()
  const tool = c.req.param('tool')
  const userId = c.get('userId')!
  const traceCtx = c.get('traceCtx')
  
  try {
    const body = await c.req.json() as ModelRequest
    
    // Route to appropriate model/endpoint
    const routingResult = await routeModelRequest(body, userId, c.env.DB)
    
    // TODO: Actually proxy to MCP server here
    // For now, return mock response
    const response = {
      id: crypto.randomUUID(),
      tool,
      result: routingResult,
      trace_id: traceCtx.traceId,
    }
    
    const duration = Date.now() - startTime
    
    // Write analytics
    writeAnalyticsEvent(c.env.ANALYTICS, {
      traceId: traceCtx.traceId,
      userId,
      tool,
      model: body.model || 'default',
      tokensIn: body.messages?.reduce((acc: number, m: any) => acc + (m.content?.length || 0), 0) || 0,
      tokensOut: JSON.stringify(response).length,
      durationMs: duration,
      status: 'success',
    })
    
    // Store trace in R2 for long-term storage
    await c.env.TRACES.put(
      `traces/${userId}/${traceCtx.traceId}.json`,
      JSON.stringify({
        ...traceCtx,
        request: body,
        response,
        duration,
        timestamp: new Date().toISOString(),
      })
    )
    
    return c.json(response)
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
    
    return c.json({ error: 'Internal server error', trace_id: traceCtx.traceId }, 500)
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
  const keyPrefix = apiKey.slice(0, 11)
  
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

// ============ MCP Server Management Routes ============

// List MCP servers
app.get('/v1/mcp-servers', authMiddleware, async (c) => {
  const userId = c.get('userId')!

  const servers = await c.env.DB.prepare(
    'SELECT * FROM mcp_servers WHERE user_id = ? ORDER BY created_at DESC'
  ).bind(userId).all()

  return c.json({ servers: servers.results })
})

// Get a specific MCP server
app.get('/v1/mcp-servers/:id', authMiddleware, async (c) => {
  const userId = c.get('userId')!
  const serverId = c.req.param('id')

  const server = await c.env.DB.prepare(
    'SELECT * FROM mcp_servers WHERE id = ? AND user_id = ?'
  ).bind(serverId, userId).first()

  if (!server) {
    return c.json({ error: 'MCP server not found' }, 404)
  }

  return c.json({ server })
})

// Create a new MCP server
app.post('/v1/mcp-servers', authMiddleware, async (c) => {
  const userId = c.get('userId')!
  const body = await c.req.json()

  // Validate transport type
  const validTransports = ['sse', 'stdio', 'http']
  if (!validTransports.includes(body.transport_type)) {
    return c.json({
      error: 'Invalid transport type. Must be one of: sse, stdio, http'
    }, 400)
  }

  // Validate required fields based on transport type
  if (body.transport_type === 'sse' || body.transport_type === 'http') {
    if (!body.endpoint_url) {
      return c.json({ error: 'endpoint_url is required for SSE and HTTP transports' }, 400)
    }
  }

  if (body.transport_type === 'stdio') {
    if (!body.command) {
      return c.json({ error: 'command is required for stdio transport' }, 400)
    }
  }

  const id = crypto.randomUUID()

  await c.env.DB.prepare(
    `INSERT INTO mcp_servers (id, user_id, name, description, transport_type,
     endpoint_url, command, args, env_vars, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id,
    userId,
    body.name,
    body.description || null,
    body.transport_type,
    body.endpoint_url || null,
    body.command || null,
    body.args ? JSON.stringify(body.args) : null,
    body.env_vars ? JSON.stringify(body.env_vars) : null,
    body.is_active !== undefined ? (body.is_active ? 1 : 0) : 1
  ).run()

  return c.json({
    id,
    name: body.name,
    transport_type: body.transport_type,
    is_active: body.is_active !== undefined ? body.is_active : true
  }, 201)
})

// Update an MCP server
app.put('/v1/mcp-servers/:id', authMiddleware, async (c) => {
  const userId = c.get('userId')!
  const serverId = c.req.param('id')
  const body = await c.req.json()

  // Check if server exists and belongs to user
  const existing = await c.env.DB.prepare(
    'SELECT id FROM mcp_servers WHERE id = ? AND user_id = ?'
  ).bind(serverId, userId).first()

  if (!existing) {
    return c.json({ error: 'MCP server not found' }, 404)
  }

  // Build update query dynamically
  const updates: string[] = []
  const values: any[] = []

  if (body.name !== undefined) {
    updates.push('name = ?')
    values.push(body.name)
  }
  if (body.description !== undefined) {
    updates.push('description = ?')
    values.push(body.description)
  }
  if (body.transport_type !== undefined) {
    updates.push('transport_type = ?')
    values.push(body.transport_type)
  }
  if (body.endpoint_url !== undefined) {
    updates.push('endpoint_url = ?')
    values.push(body.endpoint_url)
  }
  if (body.command !== undefined) {
    updates.push('command = ?')
    values.push(body.command)
  }
  if (body.args !== undefined) {
    updates.push('args = ?')
    values.push(JSON.stringify(body.args))
  }
  if (body.env_vars !== undefined) {
    updates.push('env_vars = ?')
    values.push(JSON.stringify(body.env_vars))
  }
  if (body.is_active !== undefined) {
    updates.push('is_active = ?')
    values.push(body.is_active ? 1 : 0)
  }

  updates.push("updated_at = datetime('now')")

  if (updates.length > 0) {
    await c.env.DB.prepare(
      `UPDATE mcp_servers SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`
    ).bind(...values, serverId, userId).run()
  }

  return c.json({ success: true })
})

// Delete an MCP server
app.delete('/v1/mcp-servers/:id', authMiddleware, async (c) => {
  const userId = c.get('userId')!
  const serverId = c.req.param('id')

  await c.env.DB.prepare(
    'DELETE FROM mcp_servers WHERE id = ? AND user_id = ?'
  ).bind(serverId, userId).run()

  return c.json({ success: true })
})

export default app
