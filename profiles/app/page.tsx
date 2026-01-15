export default function Home() {
  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-600 to-primary-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Build AI Apps with MCP
            </h1>
            <p className="text-xl md:text-2xl text-primary-100 mb-8 max-w-3xl mx-auto">
              The gateway platform for Model Context Protocol. Route requests, track usage,
              and deploy intelligent applications at scale.
            </p>
            <div className="flex justify-center space-x-4">
              <a
                href="/docs"
                className="bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-primary-50"
              >
                View Docs
              </a>
              <a
                href="/docs/quickstart"
                className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/10"
              >
                Quick Start
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Everything you need to build MCP apps
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard
              title="Smart Model Routing"
              description="Automatically route requests to the optimal model based on complexity and budget constraints."
              icon="🧠"
            />
            <FeatureCard
              title="W3C Distributed Tracing"
              description="Full observability with W3C Trace Context support. Debug and monitor every request."
              icon="🔍"
            />
            <FeatureCard
              title="Cost Management"
              description="Set budgets, track usage, and get alerts before hitting limits. Never overspend."
              icon="💰"
            />
            <FeatureCard
              title="Analytics Engine"
              description="Real-time analytics on request patterns, model usage, and performance metrics."
              icon="📊"
            />
            <FeatureCard
              title="LoRA Adapters"
              description="Register and manage fine-tuned model adapters for your specific use cases."
              icon="🔧"
            />
            <FeatureCard
              title="User Profiles"
              description="Showcase your projects with custom subdomains at username.makethe.app"
              icon="👤"
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gray-100 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to get started?
          </h2>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            Create an account, get your API key, and start building.
          </p>
          <a
            href="/sign-up"
            className="bg-primary-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary-700"
          >
            Create Free Account
          </a>
          <div className="mt-4 text-sm text-gray-600">
            Already have an account? <a href="/sign-in" className="text-primary-700 hover:underline">Sign in</a>
          </div>
        </div>
      </section>
    </div>
  )
}

function FeatureCard({ 
  title, 
  description, 
  icon 
}: { 
  title: string
  description: string
  icon: string 
}) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  )
}
