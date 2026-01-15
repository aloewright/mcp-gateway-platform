export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="prose prose-gray max-w-none">
        <header className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Privacy Policy</h1>
          <p className="text-gray-600 mb-3">
            Your privacy is important to us. We believe in transparency and are committed to being
            upfront about our privacy practices.
          </p>
          <p className="text-gray-600">Last Updated: August 31, 2025</p>
        </header>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">The Short Version</h2>
          <p className="text-gray-600">
            We do not collect, store, or share any personal information or data from you when you
            use our applications. Your data is your own. Period.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Information We Do Not Collect</h2>
          <p className="text-gray-600">
            Our applications are designed to respect your privacy from the ground up. We do not
            collect any of the following:
          </p>
          <ul className="list-disc list-inside text-gray-600 mt-2">
            <li>
              <strong>Personal Information:</strong> We don&apos;t ask for or collect your name,
              email address, phone number, or any other personally identifiable information.
            </li>
            <li>
              <strong>Usage Data:</strong> We do not track how you use our apps. There are no
              analytics, no activity logs, and no feature usage tracking tied to you.
            </li>
            <li>
              <strong>Device Information:</strong> We do not collect information about your device,
              such as its model, operating system, or unique identifiers.
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Our Applications</h2>
          <p className="text-gray-600">
            This privacy policy applies to all applications we publish, including but not limited
            to:
          </p>
          <ul className="list-disc list-inside text-gray-600 mt-2">
            <li>
              <strong>71one</strong>, available on the Apple App Store.
            </li>
          </ul>
          <p className="text-gray-600">
            Regardless of the application, our commitment to your privacy remains the same: we do
            not collect your data.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Third-Party Services</h2>
          <p className="text-gray-600">
            While our applications do not collect your data, it&apos;s important to understand that
            other services you use might. For example, the platform you used to download our app
            (like the Apple App Store) has its own privacy policy and data collection practices.
          </p>
          <p className="text-gray-600">
            Similarly, if you navigate to a third-party website or service from within one of our
            apps (if such functionality exists), you will be subject to that third party&apos;s
            privacy policy. We encourage you to review the privacy policies of any third-party
            services you interact with.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Changes to This Policy</h2>
          <p className="text-gray-600">
            We may update this privacy policy from time to time. Since we do not collect your
            contact information, we cannot notify you of changes. We encourage you to review this
            policy periodically. The &quot;Last Updated&quot; date at the top of this page will always
            indicate when the most recent changes were made.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Contact Us</h2>
          <p className="text-gray-600">
            If you have any questions or concerns about this privacy policy, please feel free to
            reach out. While we don&apos;t have a dedicated contact form (to avoid data collection),
            you can find our developer contact information on the app store listing for our
            applications.
          </p>
        </section>
      </div>
    </div>
  )
}
