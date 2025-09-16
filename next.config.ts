import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ['gzxfsojbbfipzvjxucci.supabase.co'],
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },

  // Remove standalone output for Netlify compatibility
  // output: 'standalone',

  // Fix cross-origin dev warnings
  allowedDevOrigins: ['http://192.168.1.2:3001', 'http://192.168.1.2:3000', 'http://192.168.1.2:3002', 'http://192.168.1.2:3003'],
  // Fix Turbopack root directory (only when explicitly enabled)
  turbopack: {
    root: __dirname,
  },
  // Improve stability
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    // Handle canvas package issues
    config.resolve.alias.canvas = false;

    // Externalize canvas for server-side rendering
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('canvas');
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
