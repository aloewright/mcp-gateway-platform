# MCP Gateway Platform

A full-stack MCP (Model Context Protocol) gateway platform built on Cloudflare infrastructure with integrated MCP server management and Claude Desktop connector.

**Live URLs:**
- 🌐 Website: https://makethe.app
- 🔌 API: https://api.makethe.app
- 🛠️ Admin: https://makethe.app/mcp-servers

## Architecture

```
mcp-gateway-platform/
├── gateway/           # Cloudflare Worker - API & MCP proxy
│   ├── src/
│   │   ├── index.ts   # Hono API routes + MCP SSE transport
│   │   ├── mcp.ts     # MCP protocol implementation
│   │   ├── trace.ts   # W3C Trace Context implementation
│   │   ├── routing.ts # Model routing & budget management
│   │   └── analytics.ts # Analytics Engine integration
│   ├── schema.sql     # D1 database schema
│   └── wrangler.toml  # Worker configuration
├── profiles/          # Cloudflare Pages - User profiles & admin UI
│   ├── app/
│   │   ├── mcp-servers/ # MCP server management UI
│   │   └── ...        # Other pages
│   ├── middleware.ts  # Cloudflare Access authentication
│   └── wrangler.toml  # Pages configuration
├── connector/         # MCP Gateway Connector for Claude Desktop
│   ├── mcp-gateway-client.ts # TypeScript client SDK
│   ├── cli.ts         # Stdio MCP server wrapper
│   └── README.md      # Connector documentation
└── .github/workflows/ # CI/CD
```

## Cloudflare Resources

- **Workers**: MCP gateway (auth, routing, tracing, caching)
- **D1**: `mcp-gateway-db` - Users, projects, API keys, LoRA adapters, budgets
- **R2**: `mcp-traces` (trace storage), `user-assets` (uploads)
- **Analytics Engine**: `mcp_gateway_analytics` - Per-request metrics
- **Pages**: `mcp-profiles` - User profile pages & project showcase

## Features

### Core Platform
- 🔐 API key authentication with secure hashing
- 🧠 Smart model routing based on complexity & budget
- 📊 Real-time analytics with Analytics Engine
- 🔍 W3C Trace Context distributed tracing
- 💰 Cost budgets and usage tracking
- 🔧 LoRA adapter registry
- 👤 User profiles with custom subdomains

### MCP Integration (NEW)
- 🔌 **MCP SSE Transport**: Full MCP protocol support via Server-Sent Events
- 🖥️ **Claude Desktop Connector**: Connect Claude Desktop to the gateway
- 🛠️ **Server Management UI**: Web interface for managing MCP servers (Cloudflare Access protected)
- 📡 **Multi-Transport Support**: SSE, HTTP, and STDIO transports
- 🔧 **MCP Tools**: Expose gateway features via MCP protocol

## Quick Start with Claude Desktop

### 1. Get an API Key

First, create an API key via the gateway (requires account setup):
```bash
curl -X POST https://api.makethe.app/v1/api-keys \
  -H "Authorization: Bearer YOUR_EXISTING_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "Claude Desktop"}'
```

### 2. Install the Connector

```bash
cd connector
npm install
npm run build
```

### 3. Configure Claude Desktop

Add to your Claude Desktop config:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "mcp-gateway": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-gateway-platform/connector/dist/cli.js"],
      "env": {
        "MCP_GATEWAY_API_KEY": "mk_your_api_key_here"
      }
    }
  }
}
```

### 4. Restart Claude Desktop

The gateway tools will now be available in Claude Desktop!

## Available MCP Tools

When connected via the connector, Claude has access to:

- `get_user_profile` - Get your user information
- `list_projects` - List all projects
- `create_project` - Create a new project
- `get_usage` - View usage statistics and budget
- `list_api_keys` - List API keys
- `create_api_key` - Generate new API key
- `list_adapters` - List LoRA adapters
- `route_model_request` - Smart route model requests
- **`list_mcp_servers`** - List configured MCP servers
- **`create_mcp_server`** - Add new MCP server
- **`delete_mcp_server`** - Remove MCP server

## API Endpoints

### Public
- `GET /` - Health check
- `GET /v1/users/:username` - Get user profile & public projects

### MCP Transport (requires API key)
- `GET /sse?api_key=...` - Establish SSE connection for MCP
- `POST /message?session_id=...` - Send MCP JSON-RPC messages

### Authenticated (requires API key)
- `POST /v1/mcp/:tool` - Proxy MCP requests
- `GET /v1/me` - Get current user
- `PUT /v1/me` - Update profile
- `GET /v1/projects` - List projects
- `POST /v1/projects` - Create project
- `GET /v1/api-keys` - List API keys
- `POST /v1/api-keys` - Create API key
- `DELETE /v1/api-keys/:id` - Delete API key
- `GET /v1/usage` - Get usage stats
- `GET /v1/adapters` - List LoRA adapters
- `POST /v1/adapters` - Register adapter
- `POST /v1/assets/:type` - Upload asset
- **`GET /v1/mcp-servers`** - List MCP servers
- **`POST /v1/mcp-servers`** - Create MCP server
- **`GET /v1/mcp-servers/:id`** - Get MCP server details
- **`PUT /v1/mcp-servers/:id`** - Update MCP server
- **`DELETE /v1/mcp-servers/:id`** - Delete MCP server

## Development

```bash
# Install dependencies
pnpm install

# Gateway development
cd gateway
pnpm dev

# Profiles development
cd profiles
pnpm dev

# Deploy
pnpm deploy
```

## MCP Server Management UI

The platform includes a web interface for managing MCP servers, protected by Cloudflare Access:

1. Navigate to `https://makethe.app/mcp-servers`
2. Authenticate via Cloudflare Access (or enter API key in dev mode)
3. Add, edit, and delete MCP server configurations
4. Support for SSE, HTTP, and STDIO transports

### Setup Cloudflare Access

See `CLOUDFLARE_ACCESS_SETUP.md` for detailed instructions on:
- Configuring Cloudflare Access for the admin panel
- Setting up identity providers (Google, Okta, etc.)
- Implementing Zero Trust security

## Environment Variables

### Gateway (`gateway/wrangler.toml`)
- `ENVIRONMENT` - Deployment environment

### Profiles (`profiles/.env.local`)
- `CLOUDFLARE_ACCESS_TEAM_DOMAIN` - Your Cloudflare Access team domain
- `NEXT_PUBLIC_API_URL` - Gateway API URL (default: https://api.makethe.app)

### Connector (environment)
- `MCP_GATEWAY_API_KEY` - Your API key (required)
- `MCP_GATEWAY_URL` - Custom gateway URL (optional)

### CI/CD (GitHub Secrets)
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

## Additional Documentation

- `CLOUDFLARE_ACCESS_SETUP.md` - Detailed Cloudflare Access setup guide
- `connector/README.md` - MCP connector documentation and usage

## License

MIT
