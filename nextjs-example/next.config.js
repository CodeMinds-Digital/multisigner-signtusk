/** @type {import('next').NextConfig} */
const path = require('path');
const nextConfig = {
  // Remove unstable esmExternals override that can disrupt resolution
  // experimental: { esmExternals: 'loose' },
  webpack: (config, { isServer }) => {
    // Alias to unblock legacy deps and intercept rc-trigger import paths
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
      'react-dom/compat': 'react-dom',
      // Intercept all common rc-trigger entry paths to our shim
      'rc-trigger/es': path.resolve(__dirname, 'shims/rc-trigger/index.js'),
      'rc-trigger/es/index': path.resolve(__dirname, 'shims/rc-trigger/index.js'),
      'rc-trigger/es/index.js': path.resolve(__dirname, 'shims/rc-trigger/index.js'),
      'rc-trigger/lib': path.resolve(__dirname, 'shims/rc-trigger/index.js'),
      'rc-trigger': path.resolve(__dirname, 'shims/rc-trigger/index.js'),
    };

    // Handle buffer polyfill for client-side
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        buffer: require.resolve('buffer'),
        stream: false,
        crypto: false,
        fs: false,
        path: false,
        acorn: false,
        'acorn-walk': false,
      };
    }

    // Externalize acorn for server-side
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('acorn', 'acorn-walk');
    }

    return config;
  },
  // Allow loading PDFs and other assets
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'credentialless',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
