/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  distDir: '.next',
  reactStrictMode: true,
  swcMinify: true,
};

module.exports = nextConfig;