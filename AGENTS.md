# Repository Guidelines

## Project Structure & Module Organization
- `gateway/`: Cloudflare Worker API gateway using Hono; includes `src/`, `schema.sql`, and `wrangler.toml`.
- `profiles/`: Cloudflare Pages site built with Next.js App Router; main app in `profiles/app/`.
- `mcp-server/`: Local MCP stdio server wrapper for the gateway API.
- `.github/workflows/`: CI/CD workflows.

## Build, Test, and Development Commands
Use `pnpm` (workspace root).
- `pnpm install`: install workspace dependencies.
- `pnpm dev:gateway`: run the Cloudflare Worker locally (`gateway/`).
- `pnpm dev:profiles`: run the Next.js app (`profiles/`).
- `pnpm dev:mcp-server`: start the MCP stdio server.
- `pnpm deploy`: deploy gateway then profiles.
- `pnpm smoke:gateway`: quick health check against `https://api.makethe.app` (override with `MCP_GATEWAY_API_BASE`).

## Coding Style & Naming Conventions
- TypeScript is the primary language (`gateway/`, `profiles/`). Follow existing code patterns and imports.
- Keep module names descriptive and domain-focused (e.g., `routing.ts`, `analytics.ts`).
- Prefer small, single-purpose functions with explicit types for Worker bindings and request payloads.
- If you introduce new formatting or linting, document it here and in the relevant package.

## Testing Guidelines
- There are no repo-wide automated tests configured. Use `pnpm smoke:gateway` for a quick API sanity check.
- For Next.js changes, run `pnpm --filter profiles build` before deployment.
- For Worker changes, validate locally with `pnpm --filter gateway dev` and D1 migrations when needed.

## Commit & Pull Request Guidelines
- Commit history follows Conventional Commits (e.g., `feat: add mcp server`, `fix: handle bad token`).
- Keep PRs focused; include a clear description, testing notes, and screenshots for `profiles/` UI changes.
- Link related issues or tickets when available.

## Security & Configuration Tips
- Do not commit secrets. Use Cloudflare and GitHub Secrets for `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
- The MCP server expects `MCP_GATEWAY_API_KEY` in the environment when running locally.
