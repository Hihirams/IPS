import Link from 'next/link';
import { ProductCard } from '@/components/product-card';
import { api } from '@/lib/api';
import type { Category, PublicProduct } from '@ecommerce/types';

/**
 * Página principal del ecommerce.
 *
 * Muestra productos destacados (o recientes si no hay destacados),
 * categorías principales con conteo y hero banner.
 * Usa SSR con revalidación cada 5 minutos.
 */

// Revalidar cada 5 minutos
export const revalidate = 300;

type HomeCategory = Pick<Category, 'id' | 'name' | 'slug' | 'image'> & {
  _count?: { products?: number };
};

async function getFeaturedProducts(): Promise<PublicProduct[]> {
  try {
    // Primero intenta productos destacados
    const res = await api('/api/products?isFeatured=true&limit=8');
    const json = await res.json();
    const featured = json.data?.data ?? [];

    // Si hay destacados, devuélvelos
    if (featured.length > 0) {
      return featured;
    }

    // Si no hay destacados, muestra los productos más recientes
    const fallbackRes = await api('/api/products?limit=8&sortBy=createdAt&sortOrder=desc');
    const fallbackJson = await fallbackRes.json();
    return fallbackJson.data?.data ?? [];
  } catch {
    return [];
  }
}

async function getLatestProducts(): Promise<PublicProduct[]> {
  try {
    const res = await api('/api/products?limit=12&sortBy=createdAt&sortOrder=desc');
    const json = await res.json();
    return json.data?.data ?? [];
  } catch {
    return [];
  }
}

async function getCategories(): Promise<HomeCategory[]> {
  try {
    const res = await api('/api/categories');
    const json = await res.json();
    const allCategories = (json.data ?? []) as HomeCategory[];
    // Solo mostrar categorías que tengan productos y sean de nivel 1
    return allCategories
      .filter((cat) => (cat._count?.products ?? 0) > 0)
      .slice(0, 9);
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const [featuredProducts, latestProducts, categories] = await Promise.all([
    getFeaturedProducts(),
    getLatestProducts(),
    getCategories(),
  ]);

  // Determinar si los "featured" son realmente destacados o un fallback
  const hasFeatured = featuredProducts.some((p) => p.isFeatured);

  return (
    <div>
      {/* Hero Banner */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 py-20 text-white sm:py-28">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDE4YzAtOS45NC04LjA2LTE4LTE4LTE4UzAgOC4wNiAwIDE4czguMDYgMTggMTggMTggMTgtOC4wNiAxOC0xOHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-50" />
        <div className="relative mx-auto max-w-7xl px-4">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium backdrop-blur-sm">
              <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
              Catálogo actualizado
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Tecnología de{' '}
              <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                Última Generación
              </span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-slate-300">
              Descubre miles de productos tecnológicos al mejor precio.
              Laptops, smartphones, componentes, accesorios y mucho más.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/productos"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-slate-900 shadow-lg shadow-white/10 transition hover:bg-slate-100 hover:shadow-white/20"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                </svg>
                Explorar Catálogo
              </Link>
              <Link
                href="/productos?soloStock=true"
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:border-white/50 hover:bg-white/10"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Solo disponibles
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Categorías */}
      {categories.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-16">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Categorías</h2>
              <p className="mt-1 text-sm text-slate-600">Explora por tipo de producto</p>
            </div>
            <Link
              href="/productos"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              Ver todas →
            </Link>
          </div>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/productos?categoria=${cat.slug}`}
                className="group relative flex items-center gap-4 overflow-hidden rounded-xl border border-slate-200 bg-white p-4 transition-all duration-200 hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-500/5"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-50 to-blue-50 text-indigo-600 transition-colors group-hover:from-indigo-100 group-hover:to-blue-100">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-slate-900 truncate">{cat.name}</h3>
                  <p className="text-xs text-slate-500">
                    {cat._count?.products ?? 0} productos
                  </p>
                </div>
                <svg className="h-5 w-5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Productos Destacados / Recientes */}
      {featuredProducts.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-16">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                {hasFeatured ? 'Productos Destacados' : 'Productos Recientes'}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                {hasFeatured
                  ? 'Nuestra selección de los mejores productos'
                  : 'Lo más nuevo en nuestro catálogo'}
              </p>
            </div>
            <Link
              href={hasFeatured ? '/productos?isFeatured=true' : '/productos?ordenarPor=createdAt&orden=desc'}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              Ver todos →
            </Link>
          </div>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* Últimos Productos (si hay featured, mostrar esta sección adicional) */}
      {hasFeatured && latestProducts.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-16">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Recién Llegados</h2>
              <p className="mt-1 text-sm text-slate-600">Los últimos productos añadidos al catálogo</p>
            </div>
            <Link
              href="/productos?ordenarPor=createdAt&orden=desc"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              Ver todos →
            </Link>
          </div>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {latestProducts.slice(0, 8).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-900 px-8 py-16 text-center text-white">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTIwIDBDOC45NTQgMCAwIDguOTU0IDAgMjBzOC45NTQgMjAgMjAgMjAgMjAtOC45NTQgMjAtMjBTMzEuMDQ2IDAgMjAgMHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-60" />
          <div className="relative">
            <h2 className="text-3xl font-bold">¿Buscas algo específico?</h2>
            <p className="mx-auto mt-4 max-w-xl text-slate-300">
              Explora nuestro catálogo completo con miles de productos tecnológicos de las mejores marcas.
            </p>
            <Link
              href="/productos"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-sm font-semibold text-slate-900 shadow-lg transition hover:bg-slate-100"
            >
              Explorar Catálogo Completo
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
