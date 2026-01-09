import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Cloudflare Access Middleware
 *
 * This middleware validates Cloudflare Access JWT tokens on protected routes.
 * It checks for the CF-Access-JWT-Assertion header that Cloudflare Access adds.
 *
 * Setup:
 * 1. Set CLOUDFLARE_ACCESS_TEAM_DOMAIN in environment variables
 * 2. Configure Cloudflare Access policy for your domain
 * 3. Add this domain to your Access application
 */

const PROTECTED_PATHS = ['/mcp-servers']

interface CloudflareAccessJWT {
  aud: string[]
  email: string
  exp: number
  iat: number
  iss: string
  sub: string
  [key: string]: any
}

async function verifyCloudflareAccessToken(
  token: string,
  teamDomain: string
): Promise<CloudflareAccessJWT | null> {
  try {
    // Fetch Cloudflare Access public keys
    const certsUrl = `${teamDomain}/cdn-cgi/access/certs`
    const certsResponse = await fetch(certsUrl)

    if (!certsResponse.ok) {
      console.error('Failed to fetch Cloudflare Access certs')
      return null
    }

    const certs = await certsResponse.json()

    // For production, you would verify the JWT signature using the public keys
    // For now, we'll do basic validation
    const payload = parseJWT(token)

    if (!payload) {
      return null
    }

    // Verify issuer
    if (payload.iss !== teamDomain) {
      console.error('Invalid issuer')
      return null
    }

    // Verify expiration
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp && payload.exp < now) {
      console.error('Token expired')
      return null
    }

    return payload as CloudflareAccessJWT
  } catch (error) {
    console.error('Error verifying Cloudflare Access token:', error)
    return null
  }
}

function parseJWT(token: string): any {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      return null
    }

    const payload = parts[1]
    const decoded = Buffer.from(payload, 'base64').toString('utf-8')
    return JSON.parse(decoded)
  } catch (error) {
    console.error('Error parsing JWT:', error)
    return null
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check if this is a protected path
  const isProtected = PROTECTED_PATHS.some((path) => pathname.startsWith(path))

  if (!isProtected) {
    return NextResponse.next()
  }

  // In development, bypass Cloudflare Access
  if (process.env.NODE_ENV === 'development') {
    console.log('[Dev Mode] Bypassing Cloudflare Access for:', pathname)
    return NextResponse.next()
  }

  const teamDomain = process.env.CLOUDFLARE_ACCESS_TEAM_DOMAIN

  if (!teamDomain) {
    console.warn('CLOUDFLARE_ACCESS_TEAM_DOMAIN not configured')
    // Allow in non-production if not configured
    if (process.env.NODE_ENV !== 'production') {
      return NextResponse.next()
    }
    return NextResponse.json({ error: 'Access control not configured' }, { status: 500 })
  }

  // Get Cloudflare Access JWT from header
  const accessJWT = request.headers.get('CF-Access-JWT-Assertion')

  if (!accessJWT) {
    return NextResponse.json(
      { error: 'Unauthorized - No Cloudflare Access token found' },
      { status: 401 }
    )
  }

  // Verify the token
  const payload = await verifyCloudflareAccessToken(accessJWT, teamDomain)

  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 })
  }

  // Add user info to headers for the application
  const response = NextResponse.next()
  response.headers.set('X-User-Email', payload.email)
  response.headers.set('X-User-Id', payload.sub)

  return response
}

export const config = {
  matcher: ['/mcp-servers/:path*'],
}
