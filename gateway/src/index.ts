import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { createTraceContext, extractTraceHeaders, TraceContext } from './trace'
import { routeModelRequest, ModelRequest } from './routing'
import { writeAnalyticsEvent } from './analytics'

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

export default app
