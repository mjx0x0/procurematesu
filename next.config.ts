/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure your app is properly built for Vercel
  output: 'standalone', // This helps with Vercel deployments
  images: {
    unoptimized: true, // Optional: helps with static images
  },
};

export default nextConfig;