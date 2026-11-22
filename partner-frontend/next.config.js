/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: __dirname,
  async rewrites() {
    const backend = (process.env.PARTNER_BACKEND_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');
    return [{ source: '/api/:path*', destination: `${backend}/api/:path*` }];
  },
};

module.exports = nextConfig;
