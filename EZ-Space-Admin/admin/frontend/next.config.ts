import path from 'node:path';
import type { NextConfig } from 'next';

const backendPort = process.env.ADMIN_PORT || process.env.BACKEND_PORT || '8000';
const backendOrigin = process.env.ADMIN_API_ORIGIN || `http://127.0.0.1:${backendPort}`;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.resolve(__dirname),
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendOrigin}/api/:path*`
      }
    ];
  }
};

export default nextConfig;
