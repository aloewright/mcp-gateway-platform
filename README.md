# MCP Gateway Platform

A full-stack MCP (Model Context Protocol) gateway platform built on Cloudflare infrastructure.

**Live URLs:**
- 🌐 Website: https://makethe.app
- 🔌 API: https://api.makethe.app

## Architecture

```
mcp-gateway-platform/
├── gateway/           # Cloudflare Worker - API & MCP proxy
│   ├── src/
│   │   ├── index.ts   # Hono API routes
│   │   ├── trace.ts   # W3C Trace Context implementation
│   │   ├── routing.ts # Model routing & budget management
│   │   └── analytics.ts # Analytics Engine integration
│   ├── schema.sql     # D1 database schema
│   └── wrangler.toml  # Worker configuration
├── profiles/          # Cloudflare Pages - User profiles & showcase
│   └── app/           # Next.js 14 app router
└── .github/workflows/ # CI/CD
```

## Cloudflare Resources

- **Workers**: MCP gateway (auth, routing, tracing, caching)
- **D1**: `mcp-gateway-db` - Users, projects, API keys, LoRA adapters, budgets
- **R2**: `mcp-traces` (trace storage), `user-assets` (uploads)
- **Analytics Engine**: `mcp_gateway_analytics` - Per-request metrics
- **Pages**: `mcp-profiles` - User profile pages & project showcase

## Features

- 🔐 API key authentication with secure hashing
- 🧠 Smart model routing based on complexity & budget
- 📊 Real-time analytics with Analytics Engine
- 🔍 W3C Trace Context distributed tracing
- 💰 Cost budgets and usage tracking
- 🔧 LoRA adapter registry
- 👤 User profiles with custom subdomains

## API Endpoints

### Public
- `GET /` - Health check
- `GET /v1/users/:username` - Get user profile & public projects

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

## Environment Variables

For CI/CD, set these secrets in GitHub:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

## License

MIT
