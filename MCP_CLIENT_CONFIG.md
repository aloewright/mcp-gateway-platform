# MCP Gateway Client Configuration

This document explains how to configure MCP clients (like Claude Desktop) to connect to the MCP Gateway Platform.

## SSE Transport Configuration

The MCP Gateway Platform uses Server-Sent Events (SSE) for transport. To connect, you need:

1. An API key from https://api.makethe.app
2. The correct client configuration

### Claude Desktop Configuration

Add this to your Claude Desktop configuration file:

**Location:**
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

**Configuration:**

```json
{
  "mcpServers": {
    "mcp-gateway": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-remote",
        "https://api.makethe.app/sse?api_key=YOUR_API_KEY_HERE"
      ]
    }
  }
}
```

Replace `YOUR_API_KEY_HERE` with your actual API key (starts with `mk_`).

### Alternative: Using Environment Variables

For better security, you can use environment variables:

```json
{
  "mcpServers": {
    "mcp-gateway": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-remote",
        "https://api.makethe.app/sse?api_key=${MCP_GATEWAY_API_KEY}"
      ],
      "env": {
        "MCP_GATEWAY_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

## Available Tools

Once connected, the gateway provides these MCP tools:

- `get_user_profile` - Get your user profile
- `list_projects` - List all your projects
- `create_project` - Create a new project
- `get_usage` - Get API usage and budget info
- `list_api_keys` - List your API keys
- `create_api_key` - Create a new API key
- `list_adapters` - List LoRA adapters
- `route_model_request` - Route model requests with smart routing

## Troubleshooting

### Connection Issues

If you can't connect:

1. **Check API key**: Ensure your API key is valid and starts with `mk_`
2. **Check URL**: The SSE endpoint is `https://api.makethe.app/sse`
3. **Check package**: The package `@modelcontextprotocol/server-remote` must be available

### Authentication Errors

- Error 401: Invalid or missing API key
- Error 404: Session not found (connection may have expired)

### Testing Connection

You can test the SSE endpoint directly:

```bash
curl "https://api.makethe.app/sse?api_key=YOUR_API_KEY"
```

You should see an SSE stream with an `endpoint` message.

## Getting an API Key

1. Sign up at https://makethe.app
2. Create an API key via the dashboard
3. The key will only be shown once - save it securely

## Security Notes

- Never commit API keys to version control
- Use environment variables for production
- API keys can be rotated via the dashboard
- Keys are hashed server-side for security
