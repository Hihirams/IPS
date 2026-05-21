/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true,
  },
  transpilePackages: ['@ecommerce/types', '@ecommerce/ui', '@ecommerce/config'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: '**.syscom.mx',
      },
      {
        protocol: 'https',
        hostname: 'www.syscom.mx',
      },
      {
        protocol: 'https',
        hostname: 'cdn.syscom.mx',
      },
      {
        protocol: 'http',
        hostname: '**.syscom.mx',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },
};

export default nextConfig;
