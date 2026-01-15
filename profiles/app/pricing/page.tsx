export const runtime = 'edge'

export default function PricingPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Pricing</h1>
      <p className="text-gray-600 mb-8">Pricing is coming soon.</p>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <p className="text-gray-700">
          The API is currently in private beta. If you’d like access, request an API key.
        </p>
        <div className="mt-4">
          <a
            href="/request-access"
            className="inline-flex items-center bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
          >
            Request Access
          </a>
        </div>
      </div>
    </div>
  )
}
