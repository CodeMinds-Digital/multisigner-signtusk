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
    esmExternals: 'loose',
  },
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Ensure proper path resolution for aliases
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname, 'src'),
      // Mock problematic packages to prevent Html imports
      '@react-email/render': require('path').resolve(__dirname, 'src/lib/react-email-mock.ts'),
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

      // More aggressive externals for Netlify compatibility
      const problematicPackages = [
        '@codeminds-digital/pdfme-complete',
        '@react-email/render',
        '@hugocxl/react-to-image',
        '@react-pdf-viewer/core',
        '@react-pdf-viewer/default-layout',
        '@simplepdf/react-embed-pdf',
        'resend',
        'pdf-lib',
        'pdfjs-dist',
        'html-to-image',
        'canvas',
        'jsdom',
        'qrcode',
        'qr-code-styling',
        'qrcode.react',
        'jsqr',
      ]

      // Add as both object and function externals
      config.externals.push(...problematicPackages.map(pkg => ({ [pkg]: pkg })))

      // Add function-based externals for more aggressive exclusion
      config.externals.push((context, request, callback) => {
        if (problematicPackages.some(pkg => request.includes(pkg))) {
          return callback(null, `commonjs ${request}`)
        }
        callback()
      })
    }

    return config
  },
}

module.exports = nextConfig
