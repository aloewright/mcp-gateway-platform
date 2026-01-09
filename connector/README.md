# MCP Gateway Connector

A client connector that allows Claude Desktop and other MCP clients to connect to the MCP Gateway Platform.

## Installation

```bash
npm install -g mcp-gateway-connector
```

Or build from source:

```bash
cd connector
npm install
npm run build
```

## Usage with Claude Desktop

1. Get your API key from the MCP Gateway Platform
2. Add the connector to your Claude Desktop configuration:

### macOS/Linux

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "mcp-gateway": {
      "command": "npx",
      "args": ["-y", "mcp-gateway-connector"],
      "env": {
        "MCP_GATEWAY_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### Windows

Edit `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "mcp-gateway": {
      "command": "npx.cmd",
      "args": ["-y", "mcp-gateway-connector"],
      "env": {
        "MCP_GATEWAY_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

3. Restart Claude Desktop

## Available Tools

Once connected, Claude will have access to these tools:

- `get_user_profile` - Get your user profile information
- `list_projects` - List all your projects
- `create_project` - Create a new project
- `get_usage` - Get API usage statistics and budget information
- `list_api_keys` - List your API keys
- `create_api_key` - Create a new API key
- `list_adapters` - List your LoRA adapters
- `route_model_request` - Route model requests through the gateway

## Programmatic Usage

You can also use the connector programmatically:

```typescript
import { MCPGatewayClient } from 'mcp-gateway-connector';

const client = new MCPGatewayClient({
  apiKey: 'your-api-key'
});

await client.connect();

// List available tools
const tools = await client.listTools();
console.log('Available tools:', tools);

// Create a project
const project = await client.createProject(
  'My AI Project',
  'A project for AI experiments',
  true
);

// Get usage statistics
const usage = await client.getUsage();
console.log('Usage:', usage);

client.disconnect();
```

## Environment Variables

- `MCP_GATEWAY_API_KEY` (required) - Your MCP Gateway API key
- `MCP_GATEWAY_URL` (optional) - Custom gateway URL (defaults to https://api.makethe.app)

## Configuration

The connector uses SSE (Server-Sent Events) transport to maintain a persistent connection to the MCP Gateway Platform. All tool calls are proxied through this connection.

## Troubleshooting

If you encounter issues:

1. Verify your API key is correct
2. Check that you have network connectivity to the gateway
3. Look at Claude Desktop logs:
   - macOS: `~/Library/Logs/Claude/`
   - Windows: `%APPDATA%\Claude\logs\`

## License

MIT
