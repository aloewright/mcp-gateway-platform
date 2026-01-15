export const runtime = 'edge'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { createAuth } from '@/lib/auth-runtime'

import McpServersClient from './servers-client'

export default async function McpServersPage() {
  const auth = createAuth()
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect('/sign-in')
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <McpServersClient />
    </div>
  )
}
