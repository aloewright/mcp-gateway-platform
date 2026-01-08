import './globals.css'
import type { Metadata } from 'next'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'MakeThe.App - Build & Deploy MCP Apps',
  description: 'User profiles and project showcase for the MCP Gateway Platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">
        <Providers>
          <nav className="bg-white border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16">
                <div className="flex items-center">
                  <a href="/" className="text-xl font-bold text-primary-600">
                    MakeThe.App
                  </a>
                </div>
                <div className="flex items-center space-x-4">
                  <a href="/docs" className="text-gray-600 hover:text-gray-900">
                    Docs
                  </a>
                  <a
                    href="https://api.makethe.app"
                    className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
                  >
                    Get Started
                  </a>
                </div>
              </div>
            </div>
          </nav>
          <main>{children}</main>
          <footer className="bg-white border-t border-gray-200 mt-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div>
                  <h3 className="font-semibold text-gray-900">MakeThe.App</h3>
                  <p className="text-gray-600 mt-2 text-sm">
                    The MCP Gateway Platform for building and deploying AI-powered applications.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Product</h4>
                  <ul className="mt-2 space-y-2 text-sm text-gray-600">
                    <li><a href="/docs">Documentation</a></li>
                    <li><a href="/pricing">Pricing</a></li>
                    <li><a href="/changelog">Changelog</a></li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Legal</h4>
                  <ul className="mt-2 space-y-2 text-sm text-gray-600">
                    <li><a href="/terms">Terms & Conditions</a></li>
                    <li><a href="/privacy">Privacy Policy</a></li>
                    <li><a href="/cookies">Cookie Policy</a></li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Connect</h4>
                  <ul className="mt-2 space-y-2 text-sm text-gray-600">
                    <li><a href="https://github.com/aloewright">GitHub</a></li>
                    <li><a href="https://twitter.com">Twitter</a></li>
                  </ul>
                </div>
              </div>
              <div className="mt-8 pt-8 border-t border-gray-200 text-center text-sm text-gray-500">
                © {new Date().getFullYear()} MakeThe.App. All rights reserved.
              </div>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  )
}
