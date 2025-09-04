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
  webpack: (config) => {
    config.resolve.alias.canvas = false;

    return config;
  },
};

export default nextConfig;
