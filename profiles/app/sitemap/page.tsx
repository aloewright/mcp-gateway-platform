const sitemapLinks = [
  { href: '/', label: 'Home' },
  { href: '/docs', label: 'Docs' },
  { href: '/docs/quickstart', label: 'Quickstart' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/changelog', label: 'Changelog' },
  { href: '/request-access', label: 'Request Access' },
  { href: '/sign-in', label: 'Sign In' },
  { href: '/sign-up', label: 'Sign Up' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/mcp-servers', label: 'MCP Servers' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/tos', label: 'Terms of Service' },
  { href: '/cookies', label: 'Cookie Policy' },
]

export default function SitemapPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="prose prose-gray max-w-none">
        <header className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Sitemap</h1>
          <p className="text-gray-600">A quick index of public pages on makethe.app.</p>
        </header>

        <ul className="list-disc list-inside text-gray-600">
          {sitemapLinks.map((link) => (
            <li key={link.href}>
              <a className="text-primary-700 hover:underline" href={link.href}>
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
