/**
 * MCP Gateway Client - SSE Transport
 * Connects Claude (or any MCP client) to the MCP Gateway Platform
 */

import { EventSource } from 'eventsource';

export interface MCPMessage {
  jsonrpc: '2.0';
  id?: string | number;
  method?: string;
  params?: Record<string, unknown>;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

export interface MCPClientOptions {
  apiKey: string;
  gatewayUrl?: string;
}

export class MCPGatewayClient {
  private apiKey: string;
  private gatewayUrl: string;
  private sseUrl: string;
  private messageEndpoint?: string;
  private eventSource?: EventSource;
  private messageId = 0;
  private pendingRequests = new Map<
    string | number,
    { resolve: (value: any) => void; reject: (reason?: any) => void }
  >();

  constructor(options: MCPClientOptions) {
    this.apiKey = options.apiKey;
    this.gatewayUrl = options.gatewayUrl || 'https://api.makethe.app';
    this.sseUrl = `${this.gatewayUrl}/sse`;
  }

  /**
   * Connect to the MCP Gateway via SSE
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = `${this.sseUrl}?api_key=${encodeURIComponent(this.apiKey)}`;

      this.eventSource = new EventSource(url);

      this.eventSource.onopen = () => {
        console.log('[MCP Gateway] Connected to SSE stream');
      };

      this.eventSource.onmessage = (event) => {
        if (!event.data) return;

        try {
          const message: MCPMessage = JSON.parse(event.data);

          // Handle endpoint message
          if (message.method === 'endpoint') {
            this.messageEndpoint = (message.params as any)?.endpoint;
            console.log('[MCP Gateway] Received message endpoint:', this.messageEndpoint);

            // Initialize the connection
            this.initialize().then(() => resolve()).catch(reject);
            return;
          }

          // Handle response messages
          if (message.id !== undefined) {
            const pending = this.pendingRequests.get(message.id);
            if (pending) {
              this.pendingRequests.delete(message.id);
              if (message.error) {
                pending.reject(new Error(message.error.message));
              } else {
                pending.resolve(message.result);
              }
            }
          }
        } catch (error) {
          console.error('[MCP Gateway] Error parsing SSE message:', error);
        }
      };

      this.eventSource.onerror = (error) => {
        console.error('[MCP Gateway] SSE connection error:', error);
        reject(new Error('Failed to connect to MCP Gateway'));
      };

      // Timeout after 30 seconds
      setTimeout(() => {
        if (!this.messageEndpoint) {
          reject(new Error('Connection timeout: no endpoint received'));
        }
      }, 30000);
    });
  }

  /**
   * Initialize the MCP connection
   */
  private async initialize(): Promise<void> {
    const result = await this.sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {
        roots: { listChanged: true },
        sampling: {},
      },
      clientInfo: {
        name: 'mcp-gateway-client',
        version: '1.0.0',
      },
    });

    // Send initialized notification
    await this.sendNotification('initialized', {});

    console.log('[MCP Gateway] Initialized:', result);
  }

  /**
   * Send a JSON-RPC request and wait for response
   */
  private async sendRequest(method: string, params?: Record<string, unknown>): Promise<any> {
    if (!this.messageEndpoint) {
      throw new Error('Not connected to MCP Gateway');
    }

    const id = ++this.messageId;
    const message: MCPMessage = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      fetch(this.messageEndpoint!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      })
        .then((res) => {
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
          }
        })
        .catch((error) => {
          this.pendingRequests.delete(id);
          reject(error);
        });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  }

  /**
   * Send a JSON-RPC notification (no response expected)
   */
  private async sendNotification(method: string, params?: Record<string, unknown>): Promise<void> {
    if (!this.messageEndpoint) {
      throw new Error('Not connected to MCP Gateway');
    }

    const message: MCPMessage = {
      jsonrpc: '2.0',
      method,
      params,
    };

    await fetch(this.messageEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
  }

  /**
   * List available tools
   */
  async listTools(): Promise<any> {
    return this.sendRequest('tools/list');
  }

  /**
   * Call a tool
   */
  async callTool(name: string, args?: Record<string, unknown>): Promise<any> {
    return this.sendRequest('tools/call', { name, arguments: args || {} });
  }

  /**
   * Get user profile
   */
  async getUserProfile(): Promise<any> {
    return this.callTool('get_user_profile');
  }

  /**
   * List projects
   */
  async listProjects(): Promise<any> {
    return this.callTool('list_projects');
  }

  /**
   * Create a new project
   */
  async createProject(name: string, description?: string, isPublic = false): Promise<any> {
    return this.callTool('create_project', { name, description, is_public: isPublic });
  }

  /**
   * Get usage statistics
   */
  async getUsage(): Promise<any> {
    return this.callTool('get_usage');
  }

  /**
   * List API keys
   */
  async listApiKeys(): Promise<any> {
    return this.callTool('list_api_keys');
  }

  /**
   * Create a new API key
   */
  async createApiKey(name: string): Promise<any> {
    return this.callTool('create_api_key', { name });
  }

  /**
   * List LoRA adapters
   */
  async listAdapters(): Promise<any> {
    return this.callTool('list_adapters');
  }

  /**
   * Route a model request
   */
  async routeModelRequest(request: {
    model?: string;
    messages: Array<{ role: string; content: string }>;
    max_tokens?: number;
  }): Promise<any> {
    return this.callTool('route_model_request', request);
  }

  /**
   * Disconnect from the gateway
   */
  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = undefined;
    }
    this.messageEndpoint = undefined;
    this.pendingRequests.clear();
  }
}

/**
 * Example usage:
 *
 * const client = new MCPGatewayClient({ apiKey: 'your-api-key' });
 * await client.connect();
 *
 * const tools = await client.listTools();
 * console.log('Available tools:', tools);
 *
 * const projects = await client.listProjects();
 * console.log('Projects:', projects);
 *
 * client.disconnect();
 */
