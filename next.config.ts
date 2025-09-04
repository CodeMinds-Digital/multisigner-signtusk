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
    config.resolve.alias.canvas = false;

    // Suppress antd compatibility warnings
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    return config;
  },
};

export default nextConfig;
