'use client'

import { useMemo, useState } from 'react'

type Props = {
  apiUrl: string
}

type FormState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success' }
  | { status: 'error'; message: string }

export function RequestAccessForm({ apiUrl }: Props) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<FormState>({ status: 'idle' })

  const endpoint = useMemo(() => {
    const base = apiUrl.replace(/\/$/, '')
    return `${base}/v1/waitlist`
  }, [apiUrl])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()

    const normalized = email.trim().toLowerCase()
    if (!normalized || !normalized.includes('@')) {
      setState({ status: 'error', message: 'Please enter a valid email address.' })
      return
    }

    setState({ status: 'loading' })

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: normalized, source: 'makethe.app' }),
      })

      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null

      if (!res.ok) {
        setState({
          status: 'error',
          message: data?.error || 'Request failed. Please try again.',
        })
        return
      }

      setState({ status: 'success' })
    } catch {
      setState({
        status: 'error',
        message: 'Network error. Please try again.',
      })
    }
  }

  if (state.status === 'success') {
    return (
      <div>
        <div className="text-gray-900 font-medium">Request received</div>
        <div className="text-gray-600 text-sm mt-1">
          Thanks — we’ll follow up soon.
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-900">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-600"
          disabled={state.status === 'loading'}
          required
        />
      </div>

      {state.status === 'error' && (
        <div className="text-sm text-red-600">{state.message}</div>
      )}

      <button
        type="submit"
        className="inline-flex items-center bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-60"
        disabled={state.status === 'loading'}
      >
        {state.status === 'loading' ? 'Submitting…' : 'Request access'}
      </button>

      <div className="text-xs text-gray-500">
        This form submits to <code className="font-mono">{endpoint}</code>.
      </div>
    </form>
  )
}
