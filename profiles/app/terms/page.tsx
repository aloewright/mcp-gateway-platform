export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Terms and Conditions</h1>
      
      <div className="prose prose-gray max-w-none">
        <p className="text-gray-600 mb-6">Last updated: {new Date().toLocaleDateString()}</p>
        
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
          <p className="text-gray-600">
            By accessing and using MakeThe.App ("the Service"), you accept and agree to be bound by 
            these Terms and Conditions. If you do not agree to these terms, please do not use our Service.
          </p>
        </section>
        
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Description of Service</h2>
          <p className="text-gray-600">
            MakeThe.App provides an MCP Gateway Platform that enables users to route AI model requests, 
            track usage, manage budgets, and deploy AI-powered applications.
          </p>
        </section>
        
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">3. User Accounts</h2>
          <p className="text-gray-600">
            You are responsible for maintaining the confidentiality of your account credentials and API keys. 
            You agree to notify us immediately of any unauthorized use of your account.
          </p>
        </section>
        
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Acceptable Use</h2>
          <p className="text-gray-600">You agree not to:</p>
          <ul className="list-disc list-inside text-gray-600 mt-2">
            <li>Use the Service for any illegal purpose</li>
            <li>Attempt to gain unauthorized access to other users' accounts</li>
            <li>Interfere with or disrupt the Service</li>
            <li>Use the Service to transmit malicious code</li>
            <li>Resell or redistribute the Service without authorization</li>
          </ul>
        </section>
        
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">5. API Usage and Rate Limits</h2>
          <p className="text-gray-600">
            API usage is subject to rate limits and budget constraints as set by your account plan. 
            Exceeding these limits may result in throttled requests or temporary suspension.
          </p>
        </section>
        
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Intellectual Property</h2>
          <p className="text-gray-600">
            The Service, including its original content, features, and functionality, is owned by 
            MakeThe.App and is protected by international copyright, trademark, and other intellectual property laws.
          </p>
        </section>
        
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Limitation of Liability</h2>
          <p className="text-gray-600">
            MakeThe.App shall not be liable for any indirect, incidental, special, consequential, or 
            punitive damages resulting from your use of the Service.
          </p>
        </section>
        
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Changes to Terms</h2>
          <p className="text-gray-600">
            We reserve the right to modify these terms at any time. We will notify users of any 
            material changes via email or through the Service.
          </p>
        </section>
        
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">9. Contact</h2>
          <p className="text-gray-600">
            For questions about these Terms, please contact us at legal@makethe.app
          </p>
        </section>
      </div>
    </div>
  )
}
