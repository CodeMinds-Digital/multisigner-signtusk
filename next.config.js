/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Warning: This allows production builds to successfully complete even if
    // your project has TypeScript errors.
    ignoreBuildErrors: true,
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', 'localhost:3001'],
    },
  },
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Ensure proper path resolution for aliases
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname, 'src'),
    }

    // Handle potential Html import issues
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    }

    // Exclude problematic packages from server-side bundle
    if (isServer) {
      config.externals = config.externals || []
      config.externals.push({
        '@codeminds-digital/pdfme-complete': '@codeminds-digital/pdfme-complete',
      })
    }

    return config
  },
}

module.exports = nextConfig
