import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false, // SECURITY: oculta información del servidor
  output: 'standalone',
  images: {
    domains: ['res.cloudinary.com'],
    formats: ['image/avif', 'image/webp'],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.API_URL || 'http://localhost:4000'}/api/:path*`,
      },
    ];
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
      '@ecommerce/types': path.resolve(__dirname, '../../packages/types/src'),
      '@ecommerce/ui': path.resolve(__dirname, '../../packages/ui/src'),
    };
    return config;
  },
  // SECURITY: Configuración de SRI (Subresource Integrity)
  // Next.js genera automáticamente hashes SRI para chunks internos.
  // Para scripts externos (Stripe.js), se debe agregar el atributo
  // `integrity` manualmente en el componente <Script>.
  // Ver apps/web/src/app/(store)/checkout/page.tsx
};

export default nextConfig;
