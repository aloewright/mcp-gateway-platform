export const runtime = 'edge'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.makethe.app'

export default function DocsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Documentation</h1>
      <p className="text-gray-600 mb-8">
        Guides and references for using the MCP Gateway.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
        <a
          href="/docs/quickstart"
          className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-sm"
        >
          <div className="text-lg font-semibold text-gray-900">Quickstart</div>
          <div className="text-sm text-gray-600 mt-1">
            Make your first successful request.
          </div>
        </a>
        <a
          href="/request-access"
          className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-sm"
        >
          <div className="text-lg font-semibold text-gray-900">Request Access</div>
          <div className="text-sm text-gray-600 mt-1">
            Get an API key (private beta).
          </div>
        </a>
      </div>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Base URLs</h2>
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <p className="text-gray-700 mb-4">
            The gateway API is served from:
          </p>
          <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-x-auto text-sm">
            <code>{API_URL}</code>
          </pre>
          <p className="text-gray-600 text-sm mt-4">
            Tip: set <code className="font-mono">NEXT_PUBLIC_API_URL</code> when running locally.
          </p>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Health check</h2>
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <p className="text-gray-700 mb-4">Verify the API is up:</p>
          <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-x-auto text-sm">
            <code>{`curl ${API_URL}/`}</code>
          </pre>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Authentication</h2>
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <p className="text-gray-700 mb-4">
            Most <code className="font-mono">/v1</code> endpoints require an API key:
          </p>
          <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-x-auto text-sm">
            <code>{`curl -H "Authorization: Bearer mk_..." ${API_URL}/v1/me`}</code>
          </pre>
          <p className="text-gray-600 text-sm mt-4">
            If you don’t have a key yet, use <a href="/request-access" className="text-primary-700 hover:underline">Request Access</a>.
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-3">MCP transport (SSE)</h2>
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <p className="text-gray-700">
            The gateway exposes an MCP Server-Sent Events transport at <code className="font-mono">/sse</code> and
            a message endpoint at <code className="font-mono">/message</code>. See the Quickstart for a minimal flow.
          </p>
        </div>
      </section>
    </div>
  )
}
