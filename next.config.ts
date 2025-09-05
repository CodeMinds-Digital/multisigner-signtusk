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
    ];

    return config;
  },
};

export default nextConfig;
