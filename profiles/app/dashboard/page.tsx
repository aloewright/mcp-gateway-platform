export const runtime = 'edge'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { createAuth } from '@/lib/auth-runtime'
import DashboardClient from './dashboard-client'

export default async function DashboardPage() {
  const auth = createAuth()
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) {
    redirect('/sign-in')
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <DashboardClient user={session.user} />
    </div>
  )
}
