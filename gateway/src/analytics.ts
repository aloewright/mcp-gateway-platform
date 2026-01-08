// Analytics Engine event writer

export interface AnalyticsEvent {
  traceId: string
  userId: string
  tool: string
  model: string
  tokensIn: number
  tokensOut: number
  durationMs: number
  status: 'success' | 'error' | 'cached'
  costCents?: number
  projectId?: string
  region?: string
}

export function writeAnalyticsEvent(
  analytics: AnalyticsEngineDataset,
  event: AnalyticsEvent
): void {
  // Analytics Engine uses blobs for string data and doubles for numeric
  // Format: blobs (strings) first, then doubles (numbers)
  analytics.writeDataPoint({
    blobs: [
      event.traceId,
      event.userId,
      event.tool,
      event.model,
      event.status,
      event.projectId || '',
      event.region || 'unknown',
    ],
    doubles: [
      event.tokensIn,
      event.tokensOut,
      event.durationMs,
      event.costCents || 0,
      Date.now(),
    ],
  })
}

// Query helpers for common analytics patterns
export interface UsageStats {
  totalRequests: number
  totalTokensIn: number
  totalTokensOut: number
  totalCostCents: number
  avgDurationMs: number
  errorRate: number
}

export interface ToolUsage {
  tool: string
  count: number
  avgDurationMs: number
  totalCostCents: number
}

export interface ModelUsage {
  model: string
  count: number
  totalTokensIn: number
  totalTokensOut: number
  totalCostCents: number
}

// Note: These queries would be run via the Analytics Engine SQL API
// The actual querying happens through Cloudflare's GraphQL API

export const ANALYTICS_QUERIES = {
  // Total usage for a user in the last 30 days
  userUsage: `
    SELECT
      COUNT(*) as total_requests,
      SUM(double1) as total_tokens_in,
      SUM(double2) as total_tokens_out,
      SUM(double4) as total_cost_cents,
      AVG(double3) as avg_duration_ms,
      SUM(CASE WHEN blob5 = 'error' THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as error_rate
    FROM mcp_gateway_analytics
    WHERE blob2 = ?
    AND timestamp > NOW() - INTERVAL '30' DAY
  `,
  
  // Usage by tool
  toolBreakdown: `
    SELECT
      blob3 as tool,
      COUNT(*) as count,
      AVG(double3) as avg_duration_ms,
      SUM(double4) as total_cost_cents
    FROM mcp_gateway_analytics
    WHERE blob2 = ?
    AND timestamp > NOW() - INTERVAL '30' DAY
    GROUP BY blob3
    ORDER BY count DESC
  `,
  
  // Usage by model
  modelBreakdown: `
    SELECT
      blob4 as model,
      COUNT(*) as count,
      SUM(double1) as total_tokens_in,
      SUM(double2) as total_tokens_out,
      SUM(double4) as total_cost_cents
    FROM mcp_gateway_analytics
    WHERE blob2 = ?
    AND timestamp > NOW() - INTERVAL '30' DAY
    GROUP BY blob4
    ORDER BY total_cost_cents DESC
  `,
  
  // Daily usage trend
  dailyTrend: `
    SELECT
      DATE(timestamp) as date,
      COUNT(*) as requests,
      SUM(double4) as cost_cents
    FROM mcp_gateway_analytics
    WHERE blob2 = ?
    AND timestamp > NOW() - INTERVAL '30' DAY
    GROUP BY DATE(timestamp)
    ORDER BY date
  `,
  
  // Top users (for admin dashboard)
  topUsers: `
    SELECT
      blob2 as user_id,
      COUNT(*) as total_requests,
      SUM(double4) as total_cost_cents
    FROM mcp_gateway_analytics
    WHERE timestamp > NOW() - INTERVAL '30' DAY
    GROUP BY blob2
    ORDER BY total_cost_cents DESC
    LIMIT 100
  `,
}

// Helper to format analytics data for API responses
export function formatUsageResponse(raw: any): UsageStats {
  return {
    totalRequests: raw.total_requests || 0,
    totalTokensIn: raw.total_tokens_in || 0,
    totalTokensOut: raw.total_tokens_out || 0,
    totalCostCents: raw.total_cost_cents || 0,
    avgDurationMs: raw.avg_duration_ms || 0,
    errorRate: raw.error_rate || 0,
  }
}

// Cost calculation utilities
export function formatCost(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export function calculateDailyCostLimit(monthlyBudgetCents: number): number {
  return Math.floor(monthlyBudgetCents / 30)
}

export function isApproachingLimit(currentUsage: number, limit: number, threshold = 0.8): boolean {
  return currentUsage >= limit * threshold
}
