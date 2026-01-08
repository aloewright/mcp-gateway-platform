/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'assets.makethe.app',
      },
    ],
  },
  // Required for Cloudflare Pages
  experimental: {
    runtime: 'edge',
  },
}

module.exports = nextConfig
