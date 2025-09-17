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

      // Aggressively externalize ALL email-related dependencies to prevent Html import conflicts
      config.externals.push('resend');
      config.externals.push('@react-email/render');
      config.externals.push('@react-email/components');
      config.externals.push('@react-email/html');
      config.externals.push('@react-email/head');
      config.externals.push('@react-email/preview');
      config.externals.push('nodemailer');
      config.externals.push('@documenso/nodemailer-resend');

      // Dynamic externalization for any package that might import from next/document
      config.externals.push(({ request }: { request: string }, callback: any) => {
        if (request && (
          request.includes('react-email') ||
          request.includes('next/document') ||
          request.includes('resend') ||
          request === 'resend' ||
          request.startsWith('@react-email/') ||
          request.includes('nodemailer') ||
          request === 'nodemailer' ||
          request.startsWith('@documenso/nodemailer')
        )) {
          return callback(null, `commonjs ${request}`);
        }
        callback();
      });

      // Additional safety: prevent any HTML-related imports during build
      config.externals.push(({ request }: { request: string }, callback: any) => {
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
        dns: false,
        child_process: false,
        nodemailer: false,
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
