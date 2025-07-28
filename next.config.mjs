let userConfig = undefined
try {
  userConfig = await import('./v0-user-next.config')
} catch (e) {
  // ignore error
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: false,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'https',
        hostname: 'xspderyoeancoqhdcloo.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'omtechlaser.com',
      },
      {
        protocol: 'http',
        hostname: 'omtechlaser.com',
      },
    ],
  },
  // Ensure environment variables are available in edge runtime
  env: {
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  },
  // Add security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          }
        ]
      }
    ]
  },
  // Redirect www to non-www
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'machinesformakers.com',
          },
        ],
        destination: 'https://www.machinesformakers.com/:path*',
        permanent: true,
      },
      // First define explicit routes for valid laser category pages that should NOT be redirected
      {
        source: '/lasers/desktop-diode-laser',
        destination: '/lasers/desktop-diode-laser',
        permanent: false,
      },
      {
        source: '/lasers/desktop-galvo',
        destination: '/lasers/desktop-galvo',
        permanent: false,
      },
      {
        source: '/lasers/pro-gantry',
        destination: '/lasers/pro-gantry',
        permanent: false,
      },
      {
        source: '/lasers/desktop-gantry',
        destination: '/lasers/desktop-gantry',
        permanent: false,
      },
      {
        source: '/lasers/open-diode',
        destination: '/lasers/open-diode',
        permanent: false,
      },
      {
        source: '/lasers/desktop-fiber-laser',
        destination: '/lasers/desktop-fiber-laser',
        permanent: false,
      },
      {
        source: '/lasers/high-end-fiber',
        destination: '/lasers/high-end-fiber',
        permanent: false,
      },
      // Then redirect all other /lasers/ URLs to /products/
      {
        source: '/lasers/:slug',
        destination: '/products/:slug',
        permanent: true,
      }
    ]
  },
  experimental: {
    webpackBuildWorker: true,
    parallelServerBuildTraces: true,
    parallelServerCompiles: true,
  },
  webpack: (config) => {
    // Ensure components are properly resolved
    config.resolve.alias = {
      ...config.resolve.alias,
      '@/components': './components',
    };
    return config;
  },
}

mergeConfig(nextConfig, userConfig)

function mergeConfig(nextConfig, userConfig) {
  if (!userConfig) {
    return
  }

  for (const key in userConfig) {
    if (
      typeof nextConfig[key] === 'object' &&
      !Array.isArray(nextConfig[key])
    ) {
      nextConfig[key] = {
        ...nextConfig[key],
        ...userConfig[key],
      }
    } else {
      nextConfig[key] = userConfig[key]
    }
  }
}

export default nextConfig
