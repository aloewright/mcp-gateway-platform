import type { Config } from 'drizzle-kit'

export default {
  schema: './db/better-auth-schema.ts',
  out: './db/migrations',
  dialect: 'sqlite',
} satisfies Config
