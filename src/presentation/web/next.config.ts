import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Enable Turbopack for faster development builds
  turbopack: {},

  // Enable typed routes (moved from experimental in Next.js 16)
  typedRoutes: true,

  // Configure the output directory
  distDir: '.next',
};

export default nextConfig;
