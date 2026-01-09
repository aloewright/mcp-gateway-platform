# Cloudflare MCP Server

An MCP server that provides tools for managing Cloudflare Workers and Pages deployments directly from Claude Desktop.

## Features

- Deploy Cloudflare Workers
- Deploy Cloudflare Pages applications
- Build Next.js apps for Cloudflare Pages
- Execute SQL on Cloudflare D1 databases
- List workers and pages projects
- Check deployment status

## Installation

```bash
cd mcp-servers/cloudflare
npm install
npm run build
```

## Configuration

Add to your Claude Desktop config:

### macOS
`~/Library/Application Support/Claude/claude_desktop_config.json`

### Windows
`%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "cloudflare": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-servers/cloudflare/dist/server.js"],
      "env": {
        "CLOUDFLARE_API_TOKEN": "your-api-token",
        "CLOUDFLARE_ACCOUNT_ID": "your-account-id"
      }
    }
  }
}
```

## Environment Variables

- `CLOUDFLARE_API_TOKEN`: Your Cloudflare API token (required)
- `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare account ID (required)

Get these from: https://dash.cloudflare.com/profile/api-tokens

## Available Tools

### deploy_worker
Deploy a Cloudflare Worker using Wrangler.

**Parameters:**
- `directory` (string): Path to the worker directory

**Example usage in Claude:**
> "Deploy the gateway worker at /home/user/mcp-gateway-platform/gateway"

### deploy_pages
Deploy a Cloudflare Pages application.

**Parameters:**
- `directory` (string): Path to the build output directory
- `project_name` (string): Name of the Pages project

**Example usage in Claude:**
> "Deploy the profiles app at /home/user/mcp-gateway-platform/profiles/.vercel/output/static with project name mcp-profiles"

### build_next_for_pages
Build a Next.js app for Cloudflare Pages.

**Parameters:**
- `directory` (string): Path to the Next.js project directory

**Example usage in Claude:**
> "Build the Next.js app at /home/user/mcp-gateway-platform/profiles for Cloudflare Pages"

### d1_execute
Execute SQL on a Cloudflare D1 database.

**Parameters:**
- `database` (string): Name of the D1 database
- `sql` (string, optional): SQL query to execute
- `file` (string, optional): Path to SQL file

**Example usage in Claude:**
> "Run the migration file gateway/schema.sql on database mcp-gateway-db"

### list_workers
List all Cloudflare Workers in the account.

**Example usage in Claude:**
> "Show me all my Cloudflare Workers"

### list_pages_projects
List all Cloudflare Pages projects.

**Example usage in Claude:**
> "List my Cloudflare Pages projects"

### get_deployment_status
Get the status of a deployment.

**Parameters:**
- `project_name` (string): Name of the Pages project or Worker
- `type` (string): Type of deployment (`worker` or `pages`)

**Example usage in Claude:**
> "What's the status of my mcp-profiles Pages deployment?"

## Usage Example

Once configured, you can ask Claude:

> "Can you deploy the MCP gateway platform? Build the profiles app for Cloudflare Pages and deploy it along with the gateway worker."

Claude will:
1. Build the Next.js app using `build_next_for_pages`
2. Deploy the Pages app using `deploy_pages`
3. Deploy the Worker using `deploy_worker`
4. Report the deployment status

## Security Notes

- The API token should have minimal permissions (only Workers and Pages)
- Never commit your API tokens to version control
- Use environment variables or secure secret storage
- Consider using Wrangler's built-in authentication instead

## Troubleshooting

### "Command not found: wrangler"

Ensure Wrangler is installed:
```bash
npm install -g wrangler
```

Or use pnpm in your project:
```bash
pnpm install
```

### "Unauthorized" errors

Check that your `CLOUDFLARE_API_TOKEN` is valid and has the correct permissions.

### Build errors with Next.js

Ensure @cloudflare/next-on-pages is installed in your profiles project:
```bash
cd profiles
pnpm install @cloudflare/next-on-pages
```

## License

MIT
