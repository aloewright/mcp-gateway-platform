export const runtime = 'edge'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.makethe.app'

export default function QuickstartPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <a href="/docs" className="text-primary-700 hover:underline text-sm">
          ← Back to Docs
        </a>
      </div>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">Quickstart</h1>
      <p className="text-gray-600 mb-10">
        Get from zero to your first authenticated request.
      </p>

      <div className="space-y-8">
        <section className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">1) Check the API</h2>
          <p className="text-gray-700 mb-4">Confirm the gateway is responding:</p>
          <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-x-auto text-sm">
            <code>{`curl ${API_URL}/`}</code>
          </pre>
          <p className="text-gray-600 text-sm mt-4">
            You should see a JSON response like <code className="font-mono">{"{"}status:"ok"...{"}"}</code>.
          </p>
        </section>

        <section className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">2) Get an API key</h2>
          <p className="text-gray-700 mb-4">
            The API is currently private beta. Request access here:
          </p>
          <a
            href="/request-access"
            className="inline-flex items-center bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
          >
            Request Access
          </a>
        </section>

        <section className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">3) Call an authenticated endpoint</h2>
          <p className="text-gray-700 mb-4">
            Once you have a key, use it as a Bearer token:
          </p>
          <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-x-auto text-sm">
            <code>{`curl \\
  -H "Authorization: Bearer mk_..." \\
  ${API_URL}/v1/me`}</code>
          </pre>
        </section>

        <section className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">4) (Optional) Use MCP over SSE</h2>
          <p className="text-gray-700 mb-4">
            The gateway provides an MCP SSE transport:
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-2">
            <li>
              <code className="font-mono">GET /sse?api_key=mk_...</code> to open an SSE stream
            </li>
            <li>
              <code className="font-mono">POST /message?session_id=...</code> to send JSON-RPC messages
            </li>
          </ul>
          <p className="text-gray-600 text-sm mt-4">
            If you’re integrating via a local MCP client, the repo also includes a stdio wrapper in <code className="font-mono">mcp-server/</code>.
          </p>
        </section>
      </div>
    </div>
  )
}
