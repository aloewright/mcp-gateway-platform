// MCP (Model Context Protocol) SSE Transport Handler

export interface MCPMessage {
  jsonrpc: '2.0'
  id?: string | number
  method?: string
  params?: Record<string, unknown>
  result?: unknown
  error?: { code: number; message: string; data?: unknown }
}

export interface MCPServerInfo {
  name: string
  version: string
}

export interface MCPCapabilities {
  tools?: { listChanged?: boolean }
  resources?: { listChanged?: boolean; subscribe?: boolean }
  prompts?: { listChanged?: boolean }
}

export interface MCPTool {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
}

// Define available tools
export const GATEWAY_TOOLS: MCPTool[] = [
  {
    name: 'get_user_profile',
    description: 'Get the current authenticated user profile',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'list_projects',
    description: 'List all projects for the authenticated user',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'create_project',
    description: 'Create a new project',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Project name' },
        description: { type: 'string', description: 'Project description' },
        is_public: { type: 'boolean', description: 'Whether the project is public' },
      },
      required: ['name'],
    },
  },
  {
    name: 'get_usage',
    description: 'Get API usage statistics and budget information',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'list_api_keys',
    description: 'List all API keys for the authenticated user',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'create_api_key',
    description: 'Create a new API key',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name/description for the API key' },
      },
      required: ['name'],
    },
  },
  {
    name: 'list_adapters',
    description: 'List all LoRA adapters for the authenticated user',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'route_model_request',
    description: 'Route a model request through the gateway with smart routing and budget management',
    inputSchema: {
      type: 'object',
      properties: {
        model: { type: 'string', description: 'Target model (e.g., claude-3-haiku, gpt-4o)' },
        messages: {
          type: 'array',
          description: 'Array of message objects with role and content',
          items: {
            type: 'object',
            properties: {
              role: { type: 'string' },
              content: { type: 'string' },
            },
          },
        },
        max_tokens: { type: 'number', description: 'Maximum tokens for response' },
      },
      required: ['messages'],
    },
  },
]

export function createInitializeResponse(id: string | number): MCPMessage {
  return {
    jsonrpc: '2.0',
    id,
    result: {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: { listChanged: false },
      },
      serverInfo: {
        name: 'mcp-gateway',
        version: '1.0.0',
      },
    },
  }
}

export function createToolsListResponse(id: string | number): MCPMessage {
  return {
    jsonrpc: '2.0',
    id,
    result: {
      tools: GATEWAY_TOOLS,
    },
  }
}

export function createErrorResponse(
  id: string | number | null,
  code: number,
  message: string
): MCPMessage {
  return {
    jsonrpc: '2.0',
    id: id ?? undefined,
    error: { code, message },
  }
}

export function createToolResultResponse(
  id: string | number,
  result: unknown,
  isError = false
): MCPMessage {
  return {
    jsonrpc: '2.0',
    id,
    result: {
      content: [
        {
          type: 'text',
          text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
        },
      ],
      isError,
    },
  }
}

// SSE helper to format messages
export function formatSSEMessage(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

export function formatSSEData(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`
}
