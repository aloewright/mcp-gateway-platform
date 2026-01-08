export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
      
      <div className="prose prose-gray max-w-none">
        <p className="text-gray-600 mb-6">Last updated: {new Date().toLocaleDateString()}</p>
        
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Information We Collect</h2>
          <p className="text-gray-600">We collect information you provide directly:</p>
          <ul className="list-disc list-inside text-gray-600 mt-2">
            <li>Account information (email, username, profile details)</li>
            <li>API request logs and usage data</li>
            <li>Payment information (processed by third-party providers)</li>
          </ul>
        </section>
        
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">2. How We Use Your Information</h2>
          <p className="text-gray-600">We use collected information to:</p>
          <ul className="list-disc list-inside text-gray-600 mt-2">
            <li>Provide and maintain the Service</li>
            <li>Process transactions and manage billing</li>
            <li>Send service-related notifications</li>
            <li>Improve and personalize the Service</li>
            <li>Detect and prevent fraud</li>
          </ul>
        </section>
        
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Data Storage</h2>
          <p className="text-gray-600">
            Your data is stored on Cloudflare's global infrastructure, including D1 databases 
            and R2 storage. We implement industry-standard security measures to protect your data.
          </p>
        </section>
        
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Data Retention</h2>
          <p className="text-gray-600">
            We retain your account data as long as your account is active. API request traces 
            are retained for 90 days unless you request earlier deletion.
          </p>
        </section>
        
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Third-Party Services</h2>
          <p className="text-gray-600">We use the following third-party services:</p>
          <ul className="list-disc list-inside text-gray-600 mt-2">
            <li>Cloudflare (hosting, CDN, security)</li>
            <li>PostHog (analytics)</li>
            <li>Sentry (error tracking)</li>
            <li>Polar/Stripe (payment processing)</li>
          </ul>
        </section>
        
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Your Rights</h2>
          <p className="text-gray-600">You have the right to:</p>
          <ul className="list-disc list-inside text-gray-600 mt-2">
            <li>Access your personal data</li>
            <li>Correct inaccurate data</li>
            <li>Request deletion of your data</li>
            <li>Export your data</li>
            <li>Object to data processing</li>
          </ul>
        </section>
        
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Security</h2>
          <p className="text-gray-600">
            We implement appropriate technical and organizational measures to protect your data, 
            including encryption at rest and in transit, API key hashing, and access controls.
          </p>
        </section>
        
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Contact</h2>
          <p className="text-gray-600">
            For privacy-related inquiries, contact us at privacy@makethe.app
          </p>
        </section>
      </div>
    </div>
  )
}
