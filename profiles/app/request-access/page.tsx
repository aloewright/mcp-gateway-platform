import { RequestAccessForm } from './request-access-form'

export const runtime = 'edge'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.makethe.app'

export default function RequestAccessPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Request Access</h1>
      <p className="text-gray-600 mb-8">
        MakeThe.App is currently in private beta. Enter your email and we’ll follow up with next steps.
      </p>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <RequestAccessForm apiUrl={API_URL} />
        <p className="text-xs text-gray-500 mt-4">
          By submitting, you agree we may contact you about access. (No marketing spam.)
        </p>
      </div>

      <div className="mt-8 text-sm text-gray-600">
        Prefer docs first? Start with <a href="/docs/quickstart" className="text-primary-700 hover:underline">Quickstart</a>.
      </div>
    </div>
  )
}
