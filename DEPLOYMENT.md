# Deployment Guide

## Prerequisites

1. **Cloudflare Account**: Sign up at https://cloudflare.com
2. **Cloudflare API Token**: Create at https://dash.cloudflare.com/profile/api-tokens
   - Use "Edit Cloudflare Workers" template
   - Or create custom token with these permissions:
     - Account > Cloudflare Pages > Edit
     - Account > Account Settings > Read

## Environment Setup

Set your Cloudflare credentials:

```bash
export CLOUDFLARE_API_TOKEN=your_api_token_here
export CLOUDFLARE_ACCOUNT_ID=your_account_id_here
```

Or create a `.env` file in the project root:

```env
CLOUDFLARE_API_TOKEN=your_api_token_here
CLOUDFLARE_ACCOUNT_ID=your_account_id_here
```

## Deploying the Gateway (Cloudflare Workers)

```bash
cd gateway
pnpm deploy
```

This will deploy the MCP Gateway API to `api.makethe.app`.

## Deploying the Profiles App (Cloudflare Pages)

```bash
cd profiles

# Build for Cloudflare Pages
pnpm build:pages

# Deploy to Cloudflare Pages
pnpm deploy
```

This will deploy the profiles app to `mcp-profiles.pages.dev`.

### First-time Deployment

On first deployment, you may be prompted to:
1. Select your Cloudflare account
2. Choose a project name (use: `mcp-profiles`)
3. Set production branch (use: `main`)

## Setting Up Custom Domains

### For the Gateway (api.makethe.app)

1. Go to Cloudflare Dashboard > Workers & Pages
2. Select your `mcp-gateway` worker
3. Go to Settings > Triggers
4. Add custom domain: `api.makethe.app`

### For the Profiles App (makethe.app)

1. Go to Cloudflare Dashboard > Workers & Pages
2. Select your `mcp-profiles` project
3. Go to Custom Domains
4. Add domain: `makethe.app`
5. Add domain: `*.makethe.app` (for user subdomains)

## Database Migration

After deploying the gateway for the first time:

```bash
cd gateway
pnpm db:migrate
```

This creates the necessary tables in Cloudflare D1.

## Environment Variables

### Gateway Worker

Set these in the Cloudflare Dashboard or via `wrangler.toml`:
- `ENVIRONMENT`: `production`

### Profiles Pages App

Set these in Cloudflare Dashboard > Workers & Pages > mcp-profiles > Settings > Environment Variables:
- `CLOUDFLARE_ACCESS_TEAM_DOMAIN`: Your Cloudflare Access team domain
- `NEXT_PUBLIC_API_URL`: `https://api.makethe.app`

## Testing the Deployment

### Test the Gateway

```bash
curl https://api.makethe.app
# Should return: {"status":"ok","service":"mcp-gateway","version":"1.0.0"}
```

### Test the Profiles App

Visit https://makethe.app in your browser. You should see the landing page.

### Test the MCP Connector

1. Get an API key from the gateway
2. Configure Claude Desktop (see README.md)
3. Ask Claude to list projects or get usage

## Troubleshooting

### 404 Error on Profiles App

This usually means the app hasn't been deployed yet. Run:
```bash
cd profiles
pnpm build:pages
pnpm deploy
```

### Build Errors

If you get build errors, ensure dependencies are installed:
```bash
pnpm install
```

### Authentication Errors

Make sure your `CLOUDFLARE_API_TOKEN` is set and has the correct permissions.

### Database Errors

Run the migration to create tables:
```bash
cd gateway
pnpm db:migrate
```

## CI/CD with GitHub Actions

The repository includes GitHub Actions workflows. Set these secrets in your repo:

1. Go to GitHub > Settings > Secrets and variables > Actions
2. Add secrets:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`

Deployments will happen automatically on push to main.
