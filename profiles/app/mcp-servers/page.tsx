'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

interface MCPServer {
  id: string
  name: string
  description?: string
  transport_type: 'sse' | 'stdio' | 'http'
  endpoint_url?: string
  command?: string
  args?: string
  env_vars?: string
  is_active: number
  created_at: string
  updated_at: string
}

interface NewServerForm {
  name: string
  description: string
  transport_type: 'sse' | 'stdio' | 'http'
  endpoint_url: string
  command: string
  args: string
  env_vars: string
  is_active: boolean
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.makethe.app'

export default function MCPServersPage() {
  const [apiKey, setApiKey] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingServer, setEditingServer] = useState<MCPServer | null>(null)
  const [formData, setFormData] = useState<NewServerForm>({
    name: '',
    description: '',
    transport_type: 'sse',
    endpoint_url: '',
    command: '',
    args: '',
    env_vars: '',
    is_active: true,
  })

  const queryClient = useQueryClient()

  // Load API key from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('mcp_api_key')
    if (stored) {
      setApiKey(stored)
    }
  }, [])

  // Save API key to localStorage
  const handleSaveApiKey = () => {
    localStorage.setItem('mcp_api_key', apiKey)
    queryClient.invalidateQueries({ queryKey: ['mcp-servers'] })
  }

  // Fetch MCP servers
  const { data: serversData, isLoading } = useQuery({
    queryKey: ['mcp-servers', apiKey],
    queryFn: async () => {
      if (!apiKey) return { servers: [] }
      const res = await fetch(`${API_BASE}/v1/mcp-servers`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
      if (!res.ok) throw new Error('Failed to fetch servers')
      return res.json()
    },
    enabled: !!apiKey,
  })

  // Create/Update server mutation
  const saveMutation = useMutation({
    mutationFn: async (data: NewServerForm) => {
      const payload = {
        ...data,
        args: data.args ? data.args.split(',').map((s) => s.trim()) : undefined,
        env_vars: data.env_vars ? JSON.parse(data.env_vars) : undefined,
      }

      const url = editingServer
        ? `${API_BASE}/v1/mcp-servers/${editingServer.id}`
        : `${API_BASE}/v1/mcp-servers`

      const res = await fetch(url, {
        method: editingServer ? 'PUT' : 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) throw new Error('Failed to save server')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mcp-servers'] })
      setShowForm(false)
      setEditingServer(null)
      setFormData({
        name: '',
        description: '',
        transport_type: 'sse',
        endpoint_url: '',
        command: '',
        args: '',
        env_vars: '',
        is_active: true,
      })
    },
  })

  // Delete server mutation
  const deleteMutation = useMutation({
    mutationFn: async (serverId: string) => {
      const res = await fetch(`${API_BASE}/v1/mcp-servers/${serverId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${apiKey}` },
      })
      if (!res.ok) throw new Error('Failed to delete server')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mcp-servers'] })
    },
  })

  const handleEdit = (server: MCPServer) => {
    setEditingServer(server)
    setFormData({
      name: server.name,
      description: server.description || '',
      transport_type: server.transport_type,
      endpoint_url: server.endpoint_url || '',
      command: server.command || '',
      args: server.args || '',
      env_vars: server.env_vars || '',
      is_active: server.is_active === 1,
    })
    setShowForm(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    saveMutation.mutate(formData)
  }

  const servers = serversData?.servers || []

  if (!apiKey) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <h1 className="text-2xl font-bold mb-4">MCP Server Management</h1>
          <p className="text-gray-600 mb-4">
            Enter your API key to manage MCP servers
          </p>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="API Key (mk_...)"
            className="w-full px-4 py-2 border rounded-lg mb-4"
          />
          <button
            onClick={handleSaveApiKey}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Continue
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">MCP Server Management</h1>
            <p className="text-gray-600 mt-2">
              Manage your Model Context Protocol server configurations
            </p>
          </div>
          <button
            onClick={() => {
              setShowForm(true)
              setEditingServer(null)
              setFormData({
                name: '',
                description: '',
                transport_type: 'sse',
                endpoint_url: '',
                command: '',
                args: '',
                env_vars: '',
                is_active: true,
              })
            }}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Add Server
          </button>
        </div>

        {showForm && (
          <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <h2 className="text-xl font-bold mb-4">
              {editingServer ? 'Edit Server' : 'Add New Server'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Transport Type *</label>
                <select
                  value={formData.transport_type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      transport_type: e.target.value as 'sse' | 'stdio' | 'http',
                    })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="sse">SSE (Server-Sent Events)</option>
                  <option value="stdio">STDIO (Command Line)</option>
                  <option value="http">HTTP</option>
                </select>
              </div>

              {(formData.transport_type === 'sse' || formData.transport_type === 'http') && (
                <div>
                  <label className="block text-sm font-medium mb-1">Endpoint URL *</label>
                  <input
                    type="url"
                    value={formData.endpoint_url}
                    onChange={(e) =>
                      setFormData({ ...formData, endpoint_url: e.target.value })
                    }
                    required
                    placeholder="https://example.com/mcp"
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
              )}

              {formData.transport_type === 'stdio' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Command *</label>
                    <input
                      type="text"
                      value={formData.command}
                      onChange={(e) => setFormData({ ...formData, command: e.target.value })}
                      required
                      placeholder="node"
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Arguments (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={formData.args}
                      onChange={(e) => setFormData({ ...formData, args: e.target.value })}
                      placeholder="server.js, --port, 3000"
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">
                  Environment Variables (JSON)
                </label>
                <textarea
                  value={formData.env_vars}
                  onChange={(e) => setFormData({ ...formData, env_vars: e.target.value })}
                  placeholder='{"API_KEY": "value"}'
                  className="w-full px-4 py-2 border rounded-lg font-mono text-sm"
                  rows={3}
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="mr-2"
                />
                <label className="text-sm font-medium">Active</label>
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saveMutation.isPending ? 'Saving...' : editingServer ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setEditingServer(null)
                  }}
                  className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-gray-600">Loading...</div>
          ) : servers.length === 0 ? (
            <div className="p-8 text-center text-gray-600">
              No MCP servers configured. Click "Add Server" to get started.
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Name</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                    Transport
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                    Endpoint/Command
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {servers.map((server: MCPServer) => (
                  <tr key={server.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium">{server.name}</div>
                        {server.description && (
                          <div className="text-sm text-gray-600">{server.description}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                        {server.transport_type.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {server.endpoint_url || server.command || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-2 py-1 rounded ${
                          server.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {server.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(server)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete "${server.name}"?`)) {
                              deleteMutation.mutate(server.id)
                            }
                          }}
                          disabled={deleteMutation.isPending}
                          className="text-red-600 hover:text-red-800 text-sm font-medium disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
