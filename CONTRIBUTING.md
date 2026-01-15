# Contributing

## Quick Start
- Install dependencies: `pnpm install`
- Gateway dev server: `pnpm dev:gateway`
- Profiles dev server: `pnpm dev:profiles`
- MCP server (stdio): `pnpm dev:mcp-server` (requires `MCP_GATEWAY_API_KEY`)

## Project Structure
- `gateway/`: Cloudflare Worker (Hono) + D1 schema.
- `profiles/`: Next.js App Router site on Cloudflare Pages.
- `mcp-server/`: Local MCP stdio wrapper.

## Environment & Secrets
Never commit secrets. Configure locally via your secret manager or shell env.
- `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`
- `RESEND_API_KEY`, `EMAIL_FROM` (`EMAIL_FROM_NAME` optional)
- `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` (CI/CD)

## Database
- Schema lives in `gateway/schema.sql`.
- Apply locally: `pnpm --filter gateway db:migrate`
- Apply remotely: `pnpm --filter gateway db:migrate:remote`

## Code Style
- Follow existing patterns and file organization.
- Use clear, domain-based names (e.g., `routing.ts`, `analytics.ts`).
- Keep API handlers small and explicit about types.

## Testing
- No repo-wide test runner is configured yet.
- Use `pnpm smoke:gateway` for a quick API check.
- For the profiles app, run `pnpm --filter profiles build` before deploy.

## Commits & Pull Requests
- Use Conventional Commits (e.g., `feat: add gateway tool`, `fix: handle auth edge cases`).
- PRs should include a short summary, testing notes, and screenshots for UI changes.
