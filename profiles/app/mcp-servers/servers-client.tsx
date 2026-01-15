'use client'

import { useEffect, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

type McpServerRow = {
  id: string
  slug: string
  name: string
  upstream_base_url: string
  enabled: number
  created_at: string
  updated_at: string
}

type FormState =
  | { status: 'idle' }
  | { status: 'saving' }
  | { status: 'saved'; url: string }
  | { status: 'error'; message: string }

type TestState =
  | { status: 'idle' }
  | { status: 'testing'; serverId: string }
  | {
      status: 'ok'
      serverId: string
      toolCount: number | null
      durationMs: number
      statusCode: number | null
    }
  | { status: 'error'; serverId: string; message: string }

export default function McpServersClient() {
  const [servers, setServers] = useState<McpServerRow[]>([])
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [upstreamBaseUrl, setUpstreamBaseUrl] = useState('')
  const [state, setState] = useState<FormState>({ status: 'idle' })
  const [testState, setTestState] = useState<TestState>({ status: 'idle' })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editSlug, setEditSlug] = useState('')
  const [editUpstreamBaseUrl, setEditUpstreamBaseUrl] = useState('')
  const [editState, setEditState] = useState<
    | { status: 'idle' }
    | { status: 'saving'; serverId: string }
    | { status: 'error'; serverId: string; message: string }
  >({ status: 'idle' })
  const [deleteState, setDeleteState] = useState<
    | { status: 'idle' }
    | { status: 'deleting'; serverId: string }
    | { status: 'error'; serverId: string; message: string }
  >({ status: 'idle' })

  const defaultSlug = useMemo(() => {
    if (slug.trim()) {
      return slug
    }

    return name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '')
      .slice(0, 48)
  }, [name, slug])

  async function refresh() {
    const res = await fetch('/api/mcp-servers', {
      method: 'GET',
      credentials: 'include',
    })

    if (!res.ok) {
      return
    }

    const data = (await res.json()) as { servers: McpServerRow[] }
    setServers(data.servers)
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function onCreate() {
    setState({ status: 'saving' })

    try {
      const res = await fetch('/api/mcp-servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name,
          slug: defaultSlug,
          upstream_base_url: upstreamBaseUrl,
        }),
      })

      const data = (await res.json().catch(() => null)) as
        | { id: string; url: string; error?: string }
        | { error: string }
        | null

      if (!res.ok) {
        setState({ status: 'error', message: data?.error || 'Failed to save' })
        return
      }

      setState({ status: 'saved', url: (data as any).url })
      setName('')
      setSlug('')
      setUpstreamBaseUrl('')
      await refresh()
    } catch (err) {
      setState({
        status: 'error',
        message: err instanceof Error ? err.message : 'Failed to save',
      })
    }
  }

  function startEditing(server: McpServerRow) {
    setEditingId(server.id)
    setEditName(server.name)
    setEditSlug(server.slug)
    setEditUpstreamBaseUrl(server.upstream_base_url)
    setEditState({ status: 'idle' })
  }

  function cancelEditing() {
    setEditingId(null)
  }

  async function onSaveEdit(server: McpServerRow) {
    setEditState({ status: 'saving', serverId: server.id })

    try {
      const res = await fetch('/api/mcp-servers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: server.id,
          name: editName,
          slug: editSlug,
          upstream_base_url: editUpstreamBaseUrl,
        }),
      })

      const data = (await res.json().catch(() => null)) as { error?: string } | null

      if (!res.ok) {
        setEditState({
          status: 'error',
          serverId: server.id,
          message: data?.error || `Failed to save (${res.status})`,
        })
        return
      }

      setEditingId(null)
      setEditState({ status: 'idle' })
      await refresh()
    } catch (err) {
      setEditState({
        status: 'error',
        serverId: server.id,
        message: err instanceof Error ? err.message : 'Failed to save',
      })
    }
  }

  async function onToggleEnabled(server: McpServerRow) {
    setEditState({ status: 'saving', serverId: server.id })

    try {
      const res = await fetch('/api/mcp-servers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: server.id,
          enabled: !server.enabled,
        }),
      })

      const data = (await res.json().catch(() => null)) as { error?: string } | null

      if (!res.ok) {
        setEditState({
          status: 'error',
          serverId: server.id,
          message: data?.error || `Failed to update (${res.status})`,
        })
        return
      }

      setEditState({ status: 'idle' })
      await refresh()
    } catch (err) {
      setEditState({
        status: 'error',
        serverId: server.id,
        message: err instanceof Error ? err.message : 'Failed to update',
      })
    }
  }

  async function onDelete(server: McpServerRow) {
    if (!confirm(`Delete MCP server "${server.name}"? This cannot be undone.`)) {
      return
    }

    setDeleteState({ status: 'deleting', serverId: server.id })

    try {
      const res = await fetch('/api/mcp-servers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: server.id }),
      })

      const data = (await res.json().catch(() => null)) as { error?: string } | null

      if (!res.ok) {
        setDeleteState({
          status: 'error',
          serverId: server.id,
          message: data?.error || `Failed to delete (${res.status})`,
        })
        return
      }

      setDeleteState({ status: 'idle' })
      await refresh()
    } catch (err) {
      setDeleteState({
        status: 'error',
        serverId: server.id,
        message: err instanceof Error ? err.message : 'Failed to delete',
      })
    }
  }

  async function onTest(server: McpServerRow) {
    setTestState({ status: 'testing', serverId: server.id })

    try {
      const res = await fetch(`https://api.makethe.app/mcp/${server.slug}/test`, {
        method: 'GET',
        credentials: 'include',
      })

      const data = (await res.json().catch(() => null)) as
        | {
            ok: boolean
            status: number | null
            toolCount: number | null
            durationMs: number
            error: string | null
          }
        | { error: string }
        | null

      if (!res.ok) {
        setTestState({
          status: 'error',
          serverId: server.id,
          message: (data as any)?.error || `Test failed (${res.status})`,
        })
        return
      }

      if (!(data as any)?.ok) {
        setTestState({
          status: 'error',
          serverId: server.id,
          message: (data as any)?.error || 'Upstream did not return valid MCP',
        })
        return
      }

      setTestState({
        status: 'ok',
        serverId: server.id,
        toolCount: (data as any)?.toolCount ?? null,
        durationMs: (data as any)?.durationMs ?? 0,
        statusCode: (data as any)?.status ?? null,
      })
    } catch (err) {
      setTestState({
        status: 'error',
        serverId: server.id,
        message: err instanceof Error ? err.message : 'Test failed',
      })
    }
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>MCP servers</CardTitle>
          <CardDescription>
            Register a server and get a URL at <code className="font-mono">makethe.app/mcp/&lt;slug&gt;</code>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-gray-900 mb-1">Name</div>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My MCP Server" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900 mb-1">Slug</div>
                <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder={defaultSlug || 'my-server'} />
                <div className="text-xs text-gray-500 mt-1">
                  URL: <code className="font-mono">/mcp/{defaultSlug || '...'}</code>
                </div>
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-gray-900 mb-1">Upstream base URL</div>
              <Input
                value={upstreamBaseUrl}
                onChange={(e) => setUpstreamBaseUrl(e.target.value)}
                placeholder="https://your-upstream.example.com"
              />
              <div className="text-xs text-gray-500 mt-1">
                The gateway will POST JSON-RPC to <code className="font-mono">${'{'}upstream{'}'}/message</code>.
              </div>
            </div>

            {state.status === 'error' && (
              <div className="text-sm text-red-600">{state.message}</div>
            )}

            {state.status === 'saved' && (
              <div className="text-sm text-green-700">
                Saved. URL: <a className="underline" href={state.url}>{state.url}</a>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={onCreate}
                disabled={!name.trim() || !upstreamBaseUrl.trim() || state.status === 'saving'}
              >
                {state.status === 'saving' ? 'Saving…' : 'Save server'}
              </Button>
              <Button
                variant="outline"
                onClick={refresh}
              >
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Registered servers</CardTitle>
          <CardDescription>Your servers in D1.</CardDescription>
        </CardHeader>
        <CardContent>
          {servers.length === 0 ? (
            <div className="text-sm text-gray-600">No servers yet.</div>
          ) : (
            <div className="space-y-3">
               {servers.map((s) => {
                 const isEditing = editingId === s.id
                 const isSaving = editState.status === 'saving' && editState.serverId === s.id
                 const isDeleting = deleteState.status === 'deleting' && deleteState.serverId === s.id

                 return (
                   <div
                     key={s.id}
                     className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3"
                   >
                     <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                       <div className="min-w-0">
                         <div className="font-medium text-gray-900 truncate">{s.name}</div>
                         <div className="text-xs text-gray-600 break-all">
                           <code className="font-mono">/mcp/{s.slug}</code> →{' '}
                           <code className="font-mono">{s.upstream_base_url}</code>
                         </div>
                       </div>

                       <div className="flex flex-col items-start md:items-end gap-2">
                         <div className="flex flex-wrap items-center gap-2">
                           <Button
                             className="h-8 px-3"
                             variant="outline"
                             onClick={() => onTest(s)}
                             disabled={!s.enabled || (testState.status === 'testing' && testState.serverId === s.id)}
                           >
                             {testState.status === 'testing' && testState.serverId === s.id ? 'Testing…' : 'Test connection'}
                           </Button>

                           <Button
                             className="h-8 px-3"
                             variant="outline"
                             onClick={() => onToggleEnabled(s)}
                             disabled={isSaving || isDeleting}
                           >
                             {s.enabled ? 'Disable' : 'Enable'}
                           </Button>

                           {!isEditing ? (
                             <Button
                               className="h-8 px-3"
                               variant="outline"
                               onClick={() => startEditing(s)}
                               disabled={isSaving || isDeleting}
                             >
                               Edit
                             </Button>
                           ) : (
                             <>
                               <Button
                                 className="h-8 px-3"
                                 onClick={() => onSaveEdit(s)}
                                 disabled={isSaving || isDeleting || !editName.trim() || !editSlug.trim() || !editUpstreamBaseUrl.trim()}
                               >
                                 {isSaving ? 'Saving…' : 'Save'}
                               </Button>
                               <Button
                                 className="h-8 px-3"
                                 variant="outline"
                                 onClick={cancelEditing}
                                 disabled={isSaving || isDeleting}
                               >
                                 Cancel
                               </Button>
                             </>
                           )}

                           <Button
                             className="h-8 px-3"
                             variant="outline"
                             onClick={() => onDelete(s)}
                             disabled={isSaving || isDeleting}
                           >
                             {isDeleting ? 'Deleting…' : 'Delete'}
                           </Button>

                           <div className="text-xs text-gray-500">{s.enabled ? 'Enabled' : 'Disabled'}</div>
                         </div>

                         {testState.status === 'ok' && testState.serverId === s.id && (
                           <div className="text-xs text-green-700">
                             OK{typeof testState.toolCount === 'number' ? ` · ${testState.toolCount} tools` : ''} · {testState.durationMs}ms
                           </div>
                         )}

                         {testState.status === 'error' && testState.serverId === s.id && (
                           <div className="text-xs text-red-600">{testState.message}</div>
                         )}

                         {editState.status === 'error' && editState.serverId === s.id && (
                           <div className="text-xs text-red-600">{editState.message}</div>
                         )}

                         {deleteState.status === 'error' && deleteState.serverId === s.id && (
                           <div className="text-xs text-red-600">{deleteState.message}</div>
                         )}
                       </div>
                     </div>

                     {isEditing && (
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                         <div>
                           <div className="text-xs font-medium text-gray-700 mb-1">Name</div>
                           <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                         </div>
                         <div>
                           <div className="text-xs font-medium text-gray-700 mb-1">Slug</div>
                           <Input value={editSlug} onChange={(e) => setEditSlug(e.target.value)} />
                         </div>
                         <div>
                           <div className="text-xs font-medium text-gray-700 mb-1">Upstream base URL</div>
                           <Input value={editUpstreamBaseUrl} onChange={(e) => setEditUpstreamBaseUrl(e.target.value)} />
                         </div>
                       </div>
                     )}
                   </div>
                 )
               })}

            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
