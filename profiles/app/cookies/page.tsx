export default function CookiesPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Cookie Policy</h1>
      
      <div className="prose prose-gray max-w-none">
        <p className="text-gray-600 mb-6">Last updated: {new Date().toLocaleDateString()}</p>
        
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">What Are Cookies</h2>
          <p className="text-gray-600">
            Cookies are small text files stored on your device when you visit a website. 
            They help websites remember your preferences and improve your experience.
          </p>
        </section>
        
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">How We Use Cookies</h2>
          <p className="text-gray-600">MakeThe.App uses cookies for:</p>
          <ul className="list-disc list-inside text-gray-600 mt-2">
            <li><strong>Essential cookies:</strong> Required for the Service to function properly</li>
            <li><strong>Authentication cookies:</strong> To keep you logged in securely</li>
            <li><strong>Analytics cookies:</strong> To understand how you use our Service</li>
            <li><strong>Preference cookies:</strong> To remember your settings</li>
          </ul>
        </section>
        
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Types of Cookies We Use</h2>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <h3 className="font-medium text-gray-900">Essential Cookies</h3>
            <p className="text-gray-600 text-sm mt-1">
              Required for basic functionality. Cannot be disabled.
            </p>
            <ul className="text-sm text-gray-500 mt-2">
              <li>• Session management</li>
              <li>• Security tokens</li>
            </ul>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <h3 className="font-medium text-gray-900">Analytics Cookies</h3>
            <p className="text-gray-600 text-sm mt-1">
              Help us understand how visitors use our Service.
            </p>
            <ul className="text-sm text-gray-500 mt-2">
              <li>• PostHog analytics</li>
              <li>• Page view tracking</li>
            </ul>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <h3 className="font-medium text-gray-900">Functional Cookies</h3>
            <p className="text-gray-600 text-sm mt-1">
              Enable enhanced functionality and personalization.
            </p>
            <ul className="text-sm text-gray-500 mt-2">
              <li>• Theme preferences</li>
              <li>• Language settings</li>
            </ul>
          </div>
        </section>
        
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Managing Cookies</h2>
          <p className="text-gray-600">
            You can control cookies through your browser settings. Most browsers allow you to:
          </p>
          <ul className="list-disc list-inside text-gray-600 mt-2">
            <li>View cookies stored on your device</li>
            <li>Delete all or specific cookies</li>
            <li>Block third-party cookies</li>
            <li>Block all cookies from specific sites</li>
          </ul>
          <p className="text-gray-600 mt-4">
            Note: Blocking essential cookies may affect the functionality of our Service.
          </p>
        </section>
        
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Third-Party Cookies</h2>
          <p className="text-gray-600">
            We use services that may set their own cookies:
          </p>
          <ul className="list-disc list-inside text-gray-600 mt-2">
            <li>Cloudflare (security and performance)</li>
            <li>PostHog (analytics)</li>
          </ul>
        </section>
        
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Updates to This Policy</h2>
          <p className="text-gray-600">
            We may update this Cookie Policy from time to time. Changes will be posted on this page 
            with an updated revision date.
          </p>
        </section>
        
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Contact</h2>
          <p className="text-gray-600">
            For questions about our use of cookies, contact us at privacy@makethe.app
          </p>
        </section>
      </div>
    </div>
  )
}
