import Link from 'next/link';
import { ProductCard } from '@/components/product-card';
import { api } from '@/lib/api';
import { DISPLAY_CATEGORIES, findDisplayCategory } from '@/lib/categories';
import type { Category, PublicProduct } from '@ecommerce/types';

export const revalidate = 300;

type HomeCategory = Pick<Category, 'id' | 'name' | 'slug' | 'image'> & {
  _count?: { products?: number };
};

type DisplayCategoryWithCount = {
  name: string;
  slug: string;
  icon: string;
  description: string;
  productCount: number;
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
    return (json.data ?? []) as HomeCategory[];
  } catch {
    return [];
  }
}

function buildDisplayCategories(allCategories: HomeCategory[]): DisplayCategoryWithCount[] {
  const counts = new Map<string, number>();
  for (const dc of DISPLAY_CATEGORIES) {
    counts.set(dc.slug, 0);
  }

  for (const cat of allCategories) {
    const dc = findDisplayCategory(cat.name);
    if (dc) {
      const current = counts.get(dc.slug) ?? 0;
      const catCount = cat._count?.products ?? 0;
      counts.set(dc.slug, current + catCount);
    }
  }

  return DISPLAY_CATEGORIES
    .map((dc) => ({ ...dc, productCount: counts.get(dc.slug) ?? 0 }))
    .filter((dc) => dc.productCount > 0);
}

export default async function HomePage() {
  const [featuredProducts, latestProducts, allCategories] = await Promise.all([
    getFeaturedProducts(),
    getLatestProducts(),
    getCategories(),
  ]);

  const hasFeatured = featuredProducts.some((p) => p.isFeatured);
  const displayCategories = buildDisplayCategories(allCategories);

  return (
    <div>
      {/* Hero Banner — claro, sobrio, glass */}
      <section className="relative overflow-hidden px-4 pt-10 sm:pt-16">
        <div className="glass-panel relative mx-auto max-w-7xl overflow-hidden rounded-[32px] px-8 py-20 sm:px-14 sm:py-28">
          {/* Halos suaves */}
          <div className="animate-float-soft pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full bg-gradient-to-br from-blue-300/30 to-indigo-300/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-gradient-to-br from-violet-300/20 to-sky-300/20 blur-3xl" />

          <div className="relative max-w-2xl">
            <div className="chip animate-fade-up mb-5">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              Catálogo actualizado a diario
            </div>
            <h1 className="animate-fade-up delay-1 text-4xl font-semibold leading-[1.05] tracking-tight text-ink-1 sm:text-5xl lg:text-[3.75rem]">
              Tecnología y seguridad,
              <br />
              <span className="text-ink-3">a tu alcance.</span>
            </h1>
            <p className="animate-fade-up delay-2 mt-6 max-w-xl text-lg leading-relaxed text-ink-2">
              Cámaras, redes, cómputo, energía y más. Miles de productos de las
              mejores marcas, al mejor precio.
            </p>
            <div className="animate-fade-up delay-3 mt-9 flex flex-wrap gap-3">
              <Link href="/productos" className="btn-primary px-7 py-3.5">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                </svg>
                Explorar catálogo
              </Link>
              <Link href="/productos?soloStock=true" className="btn-secondary px-7 py-3.5">
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
      {displayCategories.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-16">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-ink-1">Categorías</h2>
              <p className="mt-1 text-sm text-ink-2">Explora por tipo de producto</p>
            </div>
            <Link href="/productos" className="link-accent text-sm">
              Ver todas →
            </Link>
          </div>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {displayCategories.map((cat, i) => (
              <Link
                key={cat.slug}
                href={`/productos?categoria=${cat.slug}`}
                className={`glass-interactive group animate-fade-up delay-${Math.min(i, 8)} flex items-center gap-4 rounded-[22px] p-4`}
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-black/[0.04] text-2xl transition-colors group-hover:bg-black/[0.06]">
                  {cat.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold text-ink-1">{cat.name}</h3>
                  <p className="text-xs text-ink-3">{cat.productCount} productos</p>
                </div>
                <svg className="h-5 w-5 shrink-0 text-ink-4 transition-transform group-hover:translate-x-0.5 group-hover:text-ink-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-ink-1">
                {hasFeatured ? 'Productos destacados' : 'Productos recientes'}
              </h2>
              <p className="mt-1 text-sm text-ink-2">
                {hasFeatured
                  ? 'Nuestra selección de los mejores productos'
                  : 'Lo más nuevo en nuestro catálogo'}
              </p>
            </div>
            <Link
              href={hasFeatured ? '/productos?isFeatured=true' : '/productos?ordenarPor=createdAt&orden=desc'}
              className="link-accent text-sm"
            >
              Ver todos →
            </Link>
          </div>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {featuredProducts.map((product, i) => (
              <div key={product.id} className={`animate-fade-up delay-${Math.min(i, 8)}`}>
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Últimos Productos (si hay featured, mostrar esta sección adicional) */}
      {hasFeatured && latestProducts.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-16">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-ink-1">Recién llegados</h2>
              <p className="mt-1 text-sm text-ink-2">Los últimos productos añadidos al catálogo</p>
            </div>
            <Link
              href="/productos?ordenarPor=createdAt&orden=desc"
              className="link-accent text-sm"
            >
              Ver todos →
            </Link>
          </div>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {latestProducts.slice(0, 8).map((product, i) => (
              <div key={product.id} className={`animate-fade-up delay-${Math.min(i, 8)}`}>
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="glass-panel relative overflow-hidden rounded-[28px] px-8 py-16 text-center">
          <div className="animate-float-soft pointer-events-none absolute -top-16 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-gradient-to-br from-blue-300/25 to-violet-300/20 blur-3xl" />
          <div className="relative">
            <h2 className="text-3xl font-semibold tracking-tight text-ink-1">¿Buscas algo específico?</h2>
            <p className="mx-auto mt-4 max-w-xl text-ink-2">
              Explora nuestro catálogo completo con miles de productos tecnológicos de las mejores marcas.
            </p>
            <Link href="/productos" className="btn-primary mt-8 px-8 py-3.5">
              Explorar catálogo completo
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
