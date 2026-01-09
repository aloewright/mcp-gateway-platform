#!/usr/bin/env node

/**
 * MCP Gateway Connector CLI
 * This CLI tool acts as an MCP server that forwards requests to the MCP Gateway Platform.
 * It can be configured in Claude Desktop or other MCP clients.
 */

import { MCPGatewayClient } from './mcp-gateway-client';

interface StdioMessage {
  jsonrpc: '2.0';
  id?: string | number;
  method?: string;
  params?: Record<string, unknown>;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

class MCPGatewayStdioServer {
  private client: MCPGatewayClient;
  private connected = false;

  constructor(apiKey: string, gatewayUrl?: string) {
    this.client = new MCPGatewayClient({ apiKey, gatewayUrl });
  }

  async start(): Promise<void> {
    // Connect to the gateway
    try {
      await this.client.connect();
      this.connected = true;
      this.log('Connected to MCP Gateway');
    } catch (error) {
      this.error('Failed to connect to MCP Gateway:', error);
      process.exit(1);
    }

    // Listen to stdin for JSON-RPC messages
    process.stdin.setEncoding('utf8');
    let buffer = '';

    process.stdin.on('data', (chunk) => {
      buffer += chunk;
      let newlineIndex;

      while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);

        if (line) {
          this.handleMessage(line);
        }
      }
    });

    process.stdin.on('end', () => {
      this.client.disconnect();
      process.exit(0);
    });

    process.on('SIGINT', () => {
      this.client.disconnect();
      process.exit(0);
    });
  }

  private async handleMessage(line: string): Promise<void> {
    try {
      const message: StdioMessage = JSON.parse(line);

      if (message.method === 'initialize') {
        this.sendResponse({
          jsonrpc: '2.0',
          id: message.id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: { listChanged: false },
            },
            serverInfo: {
              name: 'mcp-gateway-connector',
              version: '1.0.0',
            },
          },
        });
      } else if (message.method === 'initialized') {
        // No response needed
      } else if (message.method === 'tools/list') {
        const tools = await this.client.listTools();
        this.sendResponse({
          jsonrpc: '2.0',
          id: message.id,
          result: tools,
        });
      } else if (message.method === 'tools/call') {
        const { name, arguments: args } = message.params as any;
        const result = await this.client.callTool(name, args);
        this.sendResponse({
          jsonrpc: '2.0',
          id: message.id,
          result,
        });
      } else {
        this.sendResponse({
          jsonrpc: '2.0',
          id: message.id,
          error: {
            code: -32601,
            message: `Method not found: ${message.method}`,
          },
        });
      }
    } catch (error) {
      this.error('Error handling message:', error);
      const message: StdioMessage = JSON.parse(line);
      this.sendResponse({
        jsonrpc: '2.0',
        id: message.id,
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : 'Internal error',
        },
      });
    }
  }

  private sendResponse(response: StdioMessage): void {
    process.stdout.write(JSON.stringify(response) + '\n');
  }

  private log(...args: any[]): void {
    console.error('[MCP Gateway Connector]', ...args);
  }

  private error(...args: any[]): void {
    console.error('[MCP Gateway Connector ERROR]', ...args);
  }
}

// Main entry point
async function main() {
  const apiKey = process.env.MCP_GATEWAY_API_KEY;
  const gatewayUrl = process.env.MCP_GATEWAY_URL;

  if (!apiKey) {
    console.error('Error: MCP_GATEWAY_API_KEY environment variable is required');
    console.error('');
    console.error('Usage:');
    console.error('  MCP_GATEWAY_API_KEY=your-key mcp-gateway');
    console.error('');
    console.error('Optional:');
    console.error('  MCP_GATEWAY_URL=https://your-gateway.com (defaults to https://api.makethe.app)');
    process.exit(1);
  }

  const server = new MCPGatewayStdioServer(apiKey, gatewayUrl);
  await server.start();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
