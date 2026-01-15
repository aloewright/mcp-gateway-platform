import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'

// This file is used by @better-auth/cli to generate the Drizzle schema for D1.
// It must be importable in a Node environment (no Cloudflare bindings).

export const auth = betterAuth({
  secret: 'dev-secret-dev-secret-dev-secret-dev-secret',
  baseURL: 'http://localhost:3000',
  database: drizzleAdapter({} as any, {
    provider: 'sqlite',
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: 'DUMMY',
      clientSecret: 'DUMMY',
    },
    github: {
      clientId: 'DUMMY',
      clientSecret: 'DUMMY',
    },
    apple: {
      clientId: 'DUMMY',
      clientSecret: 'DUMMY',
    },
    gitlab: {
      clientId: 'DUMMY',
      clientSecret: 'DUMMY',
    },
  },
})
