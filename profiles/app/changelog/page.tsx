export const runtime = 'edge'

export default function ChangelogPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Changelog</h1>
      <p className="text-gray-600 mb-8">Updates will be posted here.</p>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="text-sm text-gray-500">v1.0.0</div>
        <div className="text-gray-900 font-medium mt-1">Initial public website + gateway health check</div>
        <div className="text-gray-700 mt-2">
          Basic profiles site, docs scaffolding, and Cloudflare Worker gateway.
        </div>
      </div>
    </div>
  )
}
