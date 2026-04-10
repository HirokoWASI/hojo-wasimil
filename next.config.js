/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@mendable/firecrawl-js'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/**',
      },
    ],
  },
}

module.exports = nextConfig
