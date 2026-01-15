'use client'

import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { signOut } from '@/lib/auth-client'

type ApiKeyRow = {
  id: string
  name: string
  key_prefix: string
  last_used_at: string | null
  expires_at: string | null
  created_at: string
}

type Props = {
  user: {
    id: string
    name: string
    email: string
    image?: string | null
  }
}

export default function DashboardClient({ user }: Props) {
  const [keys, setKeys] = useState<ApiKeyRow[]>([])
  const [loading, setLoading] = useState(false)
  const [newKey, setNewKey] = useState<string | null>(null)

  async function refreshKeys() {
    const res = await fetch('/api/api-keys', {
      method: 'GET',
      credentials: 'include',
    })

    if (!res.ok) {
      return
    }

    const data = (await res.json()) as { keys: ApiKeyRow[] }
    setKeys(data.keys)
  }

  useEffect(() => {
    refreshKeys()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function createKey() {
    setLoading(true)
    setNewKey(null)

    try {
      const res = await fetch('/api/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ name: 'Default' }),
      })

      const data = (await res.json().catch(() => null)) as
        | { key?: string; error?: string }
        | null

      if (!res.ok) {
        throw new Error(data?.error || 'Failed to create API key')
      }

      if (data?.key) {
        setNewKey(data.key)
      }

      await refreshKeys()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
          <CardDescription>Signed in as {user.email}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={async () => {
                await signOut({ query: { callbackURL: '/' } })
              }}
            >
              Sign out
            </Button>
            <Button onClick={createKey} disabled={loading}>
              {loading ? 'Creating…' : 'Create API key'}
            </Button>
          </div>

          {newKey && (
            <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="text-sm font-medium text-gray-900">Your new API key</div>
              <div className="text-xs text-gray-700 mt-1">
                Copy it now — you won’t be able to see it again.
              </div>
              <pre className="mt-3 overflow-x-auto rounded-md bg-white border border-amber-200 p-3 text-sm">
                <code>{newKey}</code>
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API keys</CardTitle>
          <CardDescription>Use these keys to call the gateway API.</CardDescription>
        </CardHeader>
        <CardContent>
          {keys.length === 0 ? (
            <div className="text-sm text-gray-600">No keys yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="py-2 pr-4">Name</th>
                    <th className="py-2 pr-4">Prefix</th>
                    <th className="py-2 pr-4">Last used</th>
                    <th className="py-2 pr-4">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {keys.map((k) => (
                    <tr key={k.id} className="border-t border-gray-100">
                      <td className="py-2 pr-4 text-gray-900">{k.name}</td>
                      <td className="py-2 pr-4 font-mono text-gray-700">{k.key_prefix}</td>
                      <td className="py-2 pr-4 text-gray-700">
                        {k.last_used_at ? new Date(k.last_used_at).toLocaleString() : '—'}
                      </td>
                      <td className="py-2 pr-4 text-gray-700">
                        {new Date(k.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Next steps</CardTitle>
          <CardDescription>Make your first request with your new key.</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-x-auto text-sm">
            <code>{`curl -H "Authorization: Bearer mk_..." https://api.makethe.app/v1/me`}</code>
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}
