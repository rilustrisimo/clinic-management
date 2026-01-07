import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['@tanstack/react-query'],
  },
  outputFileTracingRoot: path.resolve(__dirname, '../../'),
  transpilePackages: ['@clinic/packages-ui'],
};

export default nextConfig;
