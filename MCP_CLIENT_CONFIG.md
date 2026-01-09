# MCP Gateway Client Configuration

This document explains how to configure MCP clients (like Claude Desktop) to connect to the MCP Gateway Platform.

## Important: SSE Transport Limitation

⚠️ **Claude Desktop does NOT support SSE transport via the config file.** The `claude_desktop_config.json` file only supports stdio-based servers.

For remote SSE servers, you have two options:

1. **[RECOMMENDED] Use Claude Desktop's Native UI** (requires Pro/Team/Enterprise plan)
2. **Use a stdio-to-SSE proxy** (works with all plans)

---

## Option 1: Native Claude Desktop Connector (RECOMMENDED)

This is the officially supported method for Claude Desktop Pro, Team, and Enterprise users.

### Steps:

1. Open **Claude Desktop**
2. Go to **Settings > Connectors** (or **Settings > Custom integrations** on some versions)
3. Click **Add connector**
4. Enter your connection details:
   - **Name**: `MCP Gateway`
   - **URL**: `https://api.makethe.app/sse?api_key=YOUR_API_KEY_HERE`
5. Click **Save**

Replace `YOUR_API_KEY_HERE` with your actual API key (starts with `mk_`).

### Requirements:
- Claude Desktop Pro, Team, or Enterprise plan
- HTTPS endpoint (✅ already configured at `api.makethe.app`)
- Valid API key from https://makethe.app

---

## Option 2: stdio Proxy (For Free/Config File Users)

If you want to use the config file approach or don't have a Pro plan, you can use the `mcp-remote` proxy package:

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
        "mcp-remote",
        "https://api.makethe.app/sse?api_key=YOUR_API_KEY_HERE"
      ]
    }
  }
}
```

Replace `YOUR_API_KEY_HERE` with your actual API key (starts with `mk_`).

### With Environment Variables (More Secure):

```json
{
  "mcpServers": {
    "mcp-gateway": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote"
      ],
      "env": {
        "MCP_REMOTE_URL": "https://api.makethe.app/sse?api_key=YOUR_API_KEY_HERE"
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

### "Failed to initialize client" Error

This error typically means you're trying to use SSE transport via the config file, which isn't supported. Solutions:

1. **Use Option 1 above**: Add the connector via Claude Desktop's UI (Settings > Connectors)
2. **Use Option 2 above**: Use the `mcp-remote` proxy package (NOT `@modelcontextprotocol/server-remote`)
3. **Verify package name**: The package is `mcp-remote` (without @ prefix)
4. **Check Node.js**: Ensure you have Node.js 18+ installed (`node --version`)

### Connection Issues

If you can't connect:

1. **Check API key**: Ensure your API key is valid and starts with `mk_`
2. **Check URL format**: Must be `https://api.makethe.app/sse?api_key=YOUR_KEY`
3. **Check HTTPS**: Claude Desktop requires HTTPS for remote connectors (localhost HTTP won't work)
4. **Restart Claude Desktop**: After config changes, completely quit and restart the app

### Authentication Errors

- **401 Unauthorized**: Invalid or missing API key - verify your key at https://makethe.app
- **404 Session not found**: Connection expired - reconnect to establish a new session
- **403 Forbidden**: CORS or security issue - ensure you're using the correct URL format

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
