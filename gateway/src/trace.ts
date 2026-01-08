// W3C Trace Context implementation
// https://www.w3.org/TR/trace-context/

export interface TraceContext {
  traceId: string
  spanId: string
  parentSpanId: string | null
  sampled: boolean
  traceparent: string
  tracestate: string
}

export interface TraceHeaders {
  traceparent?: string
  tracestate?: string
}

const VERSION = '00'

function generateId(length: number): string {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

export function extractTraceHeaders(headers: Headers): TraceHeaders {
  return {
    traceparent: headers.get('traceparent') || undefined,
    tracestate: headers.get('tracestate') || undefined,
  }
}

export function parseTraceparent(traceparent: string): { 
  version: string
  traceId: string
  parentSpanId: string
  flags: string 
} | null {
  const parts = traceparent.split('-')
  if (parts.length !== 4) return null
  
  const [version, traceId, parentSpanId, flags] = parts
  
  // Validate format
  if (version.length !== 2 || traceId.length !== 32 || parentSpanId.length !== 16 || flags.length !== 2) {
    return null
  }
  
  return { version, traceId, parentSpanId, flags }
}

export function createTraceContext(headers: TraceHeaders): TraceContext {
  let traceId: string
  let parentSpanId: string | null = null
  let sampled = true
  let tracestate = headers.tracestate || ''
  
  if (headers.traceparent) {
    const parsed = parseTraceparent(headers.traceparent)
    if (parsed) {
      traceId = parsed.traceId
      parentSpanId = parsed.parentSpanId
      sampled = (parseInt(parsed.flags, 16) & 0x01) === 1
    } else {
      // Invalid traceparent, generate new
      traceId = generateId(16)
    }
  } else {
    // No traceparent, generate new trace
    traceId = generateId(16)
  }
  
  // Generate new span ID for this request
  const spanId = generateId(8)
  
  // Create traceparent header value
  const flags = sampled ? '01' : '00'
  const traceparent = `${VERSION}-${traceId}-${spanId}-${flags}`
  
  return {
    traceId,
    spanId,
    parentSpanId,
    sampled,
    traceparent,
    tracestate,
  }
}

export function createChildSpan(parent: TraceContext): TraceContext {
  const spanId = generateId(8)
  const flags = parent.sampled ? '01' : '00'
  const traceparent = `${VERSION}-${parent.traceId}-${spanId}-${flags}`
  
  return {
    traceId: parent.traceId,
    spanId,
    parentSpanId: parent.spanId,
    sampled: parent.sampled,
    traceparent,
    tracestate: parent.tracestate,
  }
}

export interface SpanData {
  name: string
  startTime: number
  endTime?: number
  attributes: Record<string, string | number | boolean>
  events: Array<{
    name: string
    timestamp: number
    attributes?: Record<string, string | number | boolean>
  }>
  status: 'ok' | 'error' | 'unset'
}

export function createSpan(name: string): SpanData {
  return {
    name,
    startTime: Date.now(),
    attributes: {},
    events: [],
    status: 'unset',
  }
}

export function endSpan(span: SpanData, status: 'ok' | 'error' = 'ok'): SpanData {
  return {
    ...span,
    endTime: Date.now(),
    status,
  }
}

export function addSpanAttribute(span: SpanData, key: string, value: string | number | boolean): SpanData {
  return {
    ...span,
    attributes: { ...span.attributes, [key]: value },
  }
}

export function addSpanEvent(span: SpanData, name: string, attributes?: Record<string, string | number | boolean>): SpanData {
  return {
    ...span,
    events: [...span.events, { name, timestamp: Date.now(), attributes }],
  }
}
