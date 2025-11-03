/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ignore ESLint warnings during build
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Ignore TypeScript errors during build (only for production builds)
  typescript: {
    ignoreBuildErrors: false, // Keep TypeScript errors enabled
  },
  images: {
    domains: ['gzxfsojbbfipzvjxucci.supabase.co'],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3001', 'localhost:3000'],
    },
    // optimizeCss: true, // Disabled - requires 'critters' package
  },

  // Performance optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },



  // Remove standalone output for Netlify compatibility
  // output: 'standalone',

  // Fix cross-origin dev warnings
  allowedDevOrigins: ['http://192.168.1.2:3001', 'http://192.168.1.2:3000', 'http://192.168.1.2:3002', 'http://192.168.1.2:3003'],
  // Fix Turbopack root directory (only when explicitly enabled)
  turbopack: {
    root: process.cwd(),
  },
  // Improve stability
  reactStrictMode: true,

  // Add headers to reduce extension interference
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ]
  },
  webpack: (config, { isServer }) => {
    // Handle canvas package issues
    config.resolve.alias.canvas = false;

    // Performance: Code splitting optimization
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            // Separate PDF libraries (heavy)
            pdf: {
              test: /[\\/]node_modules[\\/](pdfjs-dist|pdf-lib|@react-pdf-viewer|@codeminds-digital)[\\/]/,
              name: 'pdf-libs',
              priority: 10,
              reuseExistingChunk: true,
            },
            // Separate UI libraries
            ui: {
              test: /[\\/]node_modules[\\/](@radix-ui|lucide-react)[\\/]/,
              name: 'ui-libs',
              priority: 9,
              reuseExistingChunk: true,
            },
            // Separate Supabase
            supabase: {
              test: /[\\/]node_modules[\\/](@supabase)[\\/]/,
              name: 'supabase',
              priority: 8,
              reuseExistingChunk: true,
            },
            // Default vendor chunk
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendor',
              priority: 5,
              reuseExistingChunk: true,
            },
          },
        },
      }
    }

    // Externalize canvas for server-side rendering
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('canvas');

      // Externalize ExcelJS and its dependencies to prevent bundling issues
      config.externals.push('exceljs');
      config.externals.push('archiver');
      config.externals.push('archiver-utils');
      config.externals.push('pdfkit');
      config.externals.push('glob');
      config.externals.push('fs.realpath');
      config.externals.push('inflight');
      config.externals.push('path-is-absolute');

      // Aggressively externalize ALL email-related dependencies to prevent Html import conflicts
      config.externals.push('resend');
      config.externals.push('@react-email/render');
      config.externals.push('@react-email/components');
      config.externals.push('@react-email/html');
      config.externals.push('@react-email/head');
      config.externals.push('@react-email/preview');
      config.externals.push('@react-email/body');
      config.externals.push('@react-email/container');
      config.externals.push('@react-email/section');

      // Dynamic externalization for any package that might import from next/document
      config.externals.push(({ request }, callback) => {
        if (request && (
          request.includes('react-email') ||
          request.includes('next/document') ||
          request === 'resend' ||  // Only exact match, not includes!
          request.startsWith('@react-email/')
        )) {
          return callback(null, `commonjs ${request}`);
        }
        callback();
      });

      // Additional safety: prevent any HTML-related imports during build
      config.externals.push(({ request }, callback) => {
        if (request && request.includes('Html') && request.includes('next')) {
          return callback(null, `commonjs ${request}`);
        }
        callback();
      });
    }

    // Suppress antd compatibility warnings and handle client-side fallbacks
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        canvas: false,
      };
    }

    // Ignore canvas warnings in PDF libraries
    config.ignoreWarnings = [
      /canvas/,
      /Package canvas can't be external/,
      /The request canvas matches serverExternalPackages/,
      /Make sure to install the same version of the package in both locations/,
    ];

    return config;
  },
};

export default nextConfig;
