/** @type {import('next').NextConfig} */
const nextConfig = {
  // Strict React mode - helps identify potential issues
  reactStrictMode: true,

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '**.googleapis.com',
      },
    ],
  },

  // Headers for security
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },

  // Redirects (ako je potrebno u budućnosti)
  async redirects() {
    return [];
  },

  // Environment variables
  env: {
    // Any public env vars can be set here, but NEXT_PUBLIC_* is preferred
  },

  // Experimental features (ako je potrebno)
  experimental: {
    // typedRoutes: true, // Enable type-safe routes in Next.js 13.2+
  },
};

module.exports = nextConfig;
