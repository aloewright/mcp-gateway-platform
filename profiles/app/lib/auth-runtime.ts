import { getRequestContext } from '@cloudflare/next-on-pages'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { drizzle } from 'drizzle-orm/d1'

function sanitizeUsernamePart(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
}

function buildSocialProviders() {
  const providers: Record<
    string,
    { clientId: string; clientSecret: string }
  > = {}

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    providers.google = {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }
  }

  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    providers.github = {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }
  }

  if (process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET) {
    providers.apple = {
      clientId: process.env.APPLE_CLIENT_ID,
      clientSecret: process.env.APPLE_CLIENT_SECRET,
    }
  }

  if (process.env.GITLAB_CLIENT_ID && process.env.GITLAB_CLIENT_SECRET) {
    providers.gitlab = {
      clientId: process.env.GITLAB_CLIENT_ID,
      clientSecret: process.env.GITLAB_CLIENT_SECRET,
    }
  }

  return providers
}

async function sendResetPasswordEmail(options: {
  to: string
  url: string
  name?: string | null
}) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM
  const fromName = process.env.EMAIL_FROM_NAME

  if (!apiKey || !from) {
    console.warn('Reset password email skipped: RESEND_API_KEY or EMAIL_FROM missing')
    return
  }

  const fromAddress = fromName ? `${fromName} <${from}>` : from
  const greeting = options.name ? `Hi ${options.name},` : 'Hi,'
  const subject = 'Reset your MakeThe.App password'
  const text = `${greeting}\n\nUse this link to reset your password:\n${options.url}\n\nIf you did not request a password reset, you can ignore this email.`
  const html = `<p>${greeting}</p><p>Use this link to reset your password:</p><p><a href="${options.url}">${options.url}</a></p><p>If you did not request a password reset, you can ignore this email.</p>`

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromAddress,
      to: [options.to],
      subject,
      text,
      html,
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    console.error('Failed to send reset password email', response.status, body)
    throw new Error('Failed to send reset password email')
  }
}

export function createAuth() {
  const secret = process.env.BETTER_AUTH_SECRET
  if (!secret) {
    throw new Error('BETTER_AUTH_SECRET is required')
  }

  const baseURL = process.env.BETTER_AUTH_URL
  if (!baseURL) {
    throw new Error('BETTER_AUTH_URL is required')
  }

  const { env } = getRequestContext()

  const db = drizzle(env.DB)

  return betterAuth({
    secret,
    baseURL,
    database: drizzleAdapter(db, {
      provider: 'sqlite',
    }),
    emailAndPassword: {
      enabled: true,
      async sendResetPassword(data, _request) {
        if (!data.user?.email) {
          return
        }
        await sendResetPasswordEmail({
          to: data.user.email,
          url: data.url,
          name: data.user.name,
        })
      },
    },
    socialProviders: buildSocialProviders(),
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            const emailLocalPart = (user.email || '').split('@')[0] || 'user'
            const base = sanitizeUsernamePart(emailLocalPart).slice(0, 20) || 'user'
            const idSuffix = String(user.id)
              .replace(/[^a-z0-9]/gi, '')
              .toLowerCase()
              .slice(0, 6)

            const username = `${base}-${idSuffix || 'acct'}`

            // Provision a matching record in the gateway's public users table.
            // This enables /v1/users/:username and ties API keys to the same user_id.
            await env.DB.prepare(
              'INSERT OR IGNORE INTO users (id, username, email, display_name, avatar_url) VALUES (?, ?, ?, ?, ?)'
            )
              .bind(
                user.id,
                username,
                user.email,
                user.name || null,
                (user as any).image || null
              )
              .run()
          },
        },
      },
    },
  })
}
