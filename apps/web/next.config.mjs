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
  // SECURITY: Configuración de SRI (Subresource Integrity)
  // Next.js genera automáticamente hashes SRI para chunks internos.
  // Para scripts externos (Stripe.js), se debe agregar el atributo
  // `integrity` manualmente en el componente <Script>.
  // Ver apps/web/src/app/(store)/checkout/page.tsx
};

export default nextConfig;
