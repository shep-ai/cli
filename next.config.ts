import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Enable Turbopack for faster development builds
  turbopack: {},

  // Configure experimental features
  experimental: {
    // Enable typed routes
    typedRoutes: true,
  },

  // Configure the output directory
  distDir: '.next',
};

export default nextConfig;
