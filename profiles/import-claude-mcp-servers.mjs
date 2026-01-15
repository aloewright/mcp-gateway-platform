#!/usr/bin/env node

import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

function sanitizeSlug(input) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
    .slice(0, 48)
}

function homeFile(...parts) {
  return path.join(os.homedir(), ...parts)
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8')
  return JSON.parse(raw)
}

function tryDeriveUpstreamBaseUrl(serverConfig) {
  if (!serverConfig || typeof serverConfig !== 'object') return null

  // Claude Desktop MCP configs typically describe stdio commands.
  // Some custom setups may include URL-ish args/env.
  const args = Array.isArray(serverConfig.args) ? serverConfig.args.map(String) : []
  const env = serverConfig.env && typeof serverConfig.env === 'object' ? serverConfig.env : {}

  const candidates = []

  for (const value of args) {
    candidates.push(value)
  }

  for (const value of Object.values(env)) {
    if (typeof value === 'string') candidates.push(value)
  }

  for (const c of candidates) {
    if (/^https:\/\//.test(c)) {
      return c.replace(/\/$/, '')
    }
  }

  return null
}

async function main() {
  const argv = process.argv.slice(2)

  const getArg = (name) => {
    const idx = argv.indexOf(name)
    if (idx === -1) return null
    return argv[idx + 1] ?? null
  }

  const apiBase = getArg('--api-base') || 'https://makethe.app'
  const sessionCookie = getArg('--session-cookie')
  const dryRun = argv.includes('--dry-run')

  if (!sessionCookie) {
    console.error('Missing --session-cookie')
    console.error(
      'Get it from your browser devtools (Request Headers -> Cookie) for makethe.app while logged in.'
    )
    process.exit(1)
  }

  const configPaths = [
    homeFile('Library', 'Application Support', 'Claude', 'claude_desktop_config.json'),
    homeFile('.config', 'Claude', 'claude_desktop_config.json'),
  ]

  let configPath = null
  let config = null

  for (const p of configPaths) {
    try {
      config = await readJson(p)
      configPath = p
      break
    } catch {
      // keep scanning
    }
  }

  if (!config || !configPath) {
    console.error('Could not find Claude Desktop config at:')
    for (const p of configPaths) console.error(`- ${p}`)
    process.exit(1)
  }

  const servers = config?.mcpServers && typeof config.mcpServers === 'object' ? config.mcpServers : null
  if (!servers) {
    console.error('No mcpServers found in Claude config:', configPath)
    process.exit(1)
  }

  const entries = Object.entries(servers)
  if (entries.length === 0) {
    console.error('No MCP servers found in Claude config:', configPath)
    process.exit(1)
  }

  console.log(`Found ${entries.length} Claude MCP server(s) in: ${configPath}`)

  const imported = []
  const skipped = []

  for (const [name, serverConfig] of entries) {
    const slug = sanitizeSlug(name)
    const upstream = tryDeriveUpstreamBaseUrl(serverConfig)

    if (!upstream) {
      skipped.push({ name, reason: 'No https URL found in args/env (stdio server?)' })
      continue
    }

    imported.push({ name, slug, upstream_base_url: upstream })
  }

  if (imported.length === 0) {
    console.log('No importable servers found (only stdio-style configs).')
    console.log('Skipped:')
    for (const s of skipped) console.log(`- ${s.name}: ${s.reason}`)
    process.exit(0)
  }

  console.log(`Importing ${imported.length} server(s) into makethe.app…`)

  for (const server of imported) {
    if (dryRun) {
      console.log('[dry-run] Would import:', server)
      continue
    }

    const res = await fetch(`${apiBase}/api/mcp-servers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie,
      },
      body: JSON.stringify(server),
    })

    const data = await res.json().catch(() => null)

    if (!res.ok) {
      console.error(`Failed to import ${server.name} (${res.status}):`, data)
      continue
    }

    console.log(`Imported ${server.name} -> /mcp/${server.slug}`)
  }

  if (skipped.length) {
    console.log('\nSkipped (not URL-based):')
    for (const s of skipped) console.log(`- ${s.name}: ${s.reason}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
