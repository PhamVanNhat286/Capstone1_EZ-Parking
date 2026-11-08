/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Enable standalone output for Docker deployment
  output: 'standalone',
  async redirects() {
    return [
      {
        source: '/',
        destination: '/kham-pha',
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
