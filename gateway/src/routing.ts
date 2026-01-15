// Model routing logic for MCP gateway

export interface ModelRequest {
  model?: string
  messages?: Array<{ role: string; content: string }>
  tools?: string[]
  max_tokens?: number
  temperature?: number
  stream?: boolean
  [key: string]: unknown
}

export interface RoutingResult {
  targetModel: string
  targetEndpoint: string
  estimatedCost: number
  cacheHit: boolean
  rateLimited: boolean
}

const REQUEST_CACHE_TTL_MS = 5 * 60 * 1000

// Model pricing in cents per 1M tokens
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'claude-3-opus': { input: 1500, output: 7500 },
  'claude-3-sonnet': { input: 300, output: 1500 },
  'claude-3-haiku': { input: 25, output: 125 },
  'claude-3.5-sonnet': { input: 300, output: 1500 },
  'gpt-4': { input: 3000, output: 6000 },
  'gpt-4-turbo': { input: 1000, output: 3000 },
  'gpt-4o': { input: 500, output: 1500 },
  'gpt-4o-mini': { input: 15, output: 60 },
  'gemini-pro': { input: 50, output: 150 },
  'gemini-1.5-pro': { input: 125, output: 375 },
  'mistral-large': { input: 400, output: 1200 },
  'mistral-medium': { input: 270, output: 810 },
  'default': { input: 100, output: 300 },
}

// Model endpoints
const MODEL_ENDPOINTS: Record<string, string> = {
  'claude-3-opus': 'https://api.anthropic.com/v1/messages',
  'claude-3-sonnet': 'https://api.anthropic.com/v1/messages',
  'claude-3-haiku': 'https://api.anthropic.com/v1/messages',
  'claude-3.5-sonnet': 'https://api.anthropic.com/v1/messages',
  'gpt-4': 'https://api.openai.com/v1/chat/completions',
  'gpt-4-turbo': 'https://api.openai.com/v1/chat/completions',
  'gpt-4o': 'https://api.openai.com/v1/chat/completions',
  'gpt-4o-mini': 'https://api.openai.com/v1/chat/completions',
  'gemini-pro': 'https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent',
  'gemini-1.5-pro': 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent',
  'mistral-large': 'https://api.mistral.ai/v1/chat/completions',
  'mistral-medium': 'https://api.mistral.ai/v1/chat/completions',
}

export function estimateTokens(text: string): number {
  // Rough estimation: ~4 characters per token
  return Math.ceil(text.length / 4)
}

export function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = MODEL_PRICING[model] || MODEL_PRICING['default']
  const inputCost = (inputTokens / 1_000_000) * pricing.input
  const outputCost = (outputTokens / 1_000_000) * pricing.output
  return Math.ceil((inputCost + outputCost) * 100) // Return in cents
}

export async function checkBudget(userId: string, db: D1Database): Promise<{ 
  allowed: boolean
  remaining: number 
  limit: number 
}> {
  const budget = await db.prepare(
    'SELECT monthly_limit_cents, current_usage_cents FROM cost_budgets WHERE user_id = ?'
  ).bind(userId).first<{ monthly_limit_cents: number; current_usage_cents: number }>()
  
  if (!budget) {
    // No budget set, allow with default
    return { allowed: true, remaining: 10000, limit: 10000 }
  }
  
  const remaining = budget.monthly_limit_cents - budget.current_usage_cents
  return {
    allowed: remaining > 0,
    remaining,
    limit: budget.monthly_limit_cents,
  }
}

export async function updateUsage(userId: string, costCents: number, db: D1Database): Promise<void> {
  await db.prepare(
    "UPDATE cost_budgets SET current_usage_cents = current_usage_cents + ?, updated_at = datetime('now') WHERE user_id = ?"
  ).bind(costCents, userId).run()
}

export function selectModel(request: ModelRequest, budgetRemaining: number): string {
  const requestedModel = request.model || 'claude-3-haiku'
  
  // If budget is low, automatically downgrade to cheaper model
  if (budgetRemaining < 100) { // Less than $1 remaining
    const cheapModels = ['gpt-4o-mini', 'claude-3-haiku', 'gemini-pro']
    if (!cheapModels.includes(requestedModel)) {
      return 'claude-3-haiku' // Default to cheapest capable model
    }
  }
  
  return requestedModel
}

export function getCacheKey(request: ModelRequest): string {
  // Create deterministic cache key from request
  const normalized = {
    model: request.model,
    messages: request.messages,
    tools: request.tools,
    max_tokens: request.max_tokens,
    stream: request.stream || false,
    temperature: request.temperature || 0,
  }
  return JSON.stringify(normalized)
}

export async function routeModelRequest(
  request: ModelRequest,
  userId: string,
  db: D1Database
): Promise<RoutingResult> {
  // Check budget
  const budget = await checkBudget(userId, db)
  
  if (!budget.allowed) {
    return {
      targetModel: 'none',
      targetEndpoint: '',
      estimatedCost: 0,
      cacheHit: false,
      rateLimited: true,
    }
  }
  
  // Select appropriate model based on request and budget
  const targetModel = selectModel(request, budget.remaining)
  const targetEndpoint = MODEL_ENDPOINTS[targetModel] || MODEL_ENDPOINTS['claude-3-haiku']
  
  // Estimate tokens and cost
  const inputText = request.messages?.map(m => m.content).join(' ') || ''
  const inputTokens = estimateTokens(inputText)
  const estimatedOutputTokens = request.max_tokens || 1000
  const estimatedCost = estimateCost(targetModel, inputTokens, estimatedOutputTokens)
  
  const cacheKey = getCacheKey(request)
  const now = Date.now()
  const cached = await db
    .prepare('SELECT last_seen_at FROM request_cache WHERE user_id = ? AND cache_key = ?')
    .bind(userId, cacheKey)
    .first<{ last_seen_at: number }>()
  const cacheHit = Boolean(cached && now - cached.last_seen_at < REQUEST_CACHE_TTL_MS)

  await db.prepare(
    `INSERT INTO request_cache (user_id, cache_key, last_seen_at, hit_count)
     VALUES (?, ?, ?, 1)
     ON CONFLICT(user_id, cache_key)
     DO UPDATE SET last_seen_at = excluded.last_seen_at, hit_count = hit_count + 1`
  )
    .bind(userId, cacheKey, now)
    .run()

  if (Math.random() < 0.05) {
    // Occasional cleanup to keep cache size bounded without a cron job.
    await db.prepare(
      'DELETE FROM request_cache WHERE user_id = ? AND last_seen_at < ?'
    )
      .bind(userId, now - REQUEST_CACHE_TTL_MS)
      .run()
  }

  const finalEstimatedCost = cacheHit ? 0 : estimatedCost
  
  return {
    targetModel,
    targetEndpoint,
    estimatedCost: finalEstimatedCost,
    cacheHit,
    rateLimited: false,
  }
}

// Smart routing based on request characteristics
export function analyzeRequestComplexity(request: ModelRequest): 'simple' | 'medium' | 'complex' {
  const messageCount = request.messages?.length || 0
  const totalLength = request.messages?.reduce((acc, m) => acc + m.content.length, 0) || 0
  const hasTools = request.tools && request.tools.length > 0
  
  if (messageCount <= 2 && totalLength < 500 && !hasTools) {
    return 'simple'
  }
  
  if (messageCount <= 5 && totalLength < 2000) {
    return 'medium'
  }
  
  return 'complex'
}

export function recommendModel(complexity: 'simple' | 'medium' | 'complex'): string {
  switch (complexity) {
    case 'simple':
      return 'claude-3-haiku'
    case 'medium':
      return 'claude-3.5-sonnet'
    case 'complex':
      return 'claude-3-opus'
  }
}
