/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  distDir: '.next',
  reactStrictMode: true,
  
  // Force generation of trace files
  experimental: {
    // This ensures trace files are generated
    outputFileTracingRoot: process.cwd(),
  },
  
  // Disable optimizations that might affect trace generation
  swcMinify: true,
};

module.exports = nextConfig;