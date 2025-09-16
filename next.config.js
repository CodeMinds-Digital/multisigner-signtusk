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
        '@react-email/render': '@react-email/render',
        '@hugocxl/react-to-image': '@hugocxl/react-to-image',
        '@react-pdf-viewer/core': '@react-pdf-viewer/core',
        '@react-pdf-viewer/default-layout': '@react-pdf-viewer/default-layout',
        '@simplepdf/react-embed-pdf': '@simplepdf/react-embed-pdf',
        'resend': 'resend',
        'pdf-lib': 'pdf-lib',
        'pdfjs-dist': 'pdfjs-dist',
      })
    }

    return config
  },
}

module.exports = nextConfig
