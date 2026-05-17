import Link from 'next/link';
import { ProductCard } from '@/components/product-card';
import { api } from '@/lib/api';
import type { Category, PublicProduct } from '@ecommerce/types';

/**
 * Página principal del ecommerce.
 *
 * Muestra productos destacados, categorías principales y hero banner.
 * Usa SSR con revalidación cada 5 minutos.
 */

// Revalidar cada 5 minutos
export const revalidate = 300;

type HomeCategory = Pick<Category, 'id' | 'name' | 'slug' | 'image'> & {
  _count?: { products?: number };
};

async function getFeaturedProducts(): Promise<PublicProduct[]> {
  try {
    const res = await api('/api/products?isFeatured=true&limit=8');
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

export default async function HomePage() {
  const [products, categories] = await Promise.all([
    getFeaturedProducts(),
    getCategories(),
  ]);

  return (
    <div>
      {/* Hero Banner */}
      <section className="relative bg-slate-900 py-24 text-white">
        <div className="mx-auto max-w-7xl px-4">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Tecnología de Última Generación
            </h1>
            <p className="mt-6 text-lg text-slate-300">
              Descubre los mejores productos tecnológicos al mejor precio.
              Laptops, smartphones, accesorios y más.
            </p>
            <div className="mt-8 flex gap-4">
              <Link
                href="/productos"
                className="inline-flex items-center rounded-lg bg-white px-6 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100"
              >
                Ver Productos
              </Link>
              <Link
                href="/productos?isFeatured=true"
                className="inline-flex items-center rounded-lg border border-white px-6 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                Destacados
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Categorías */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="text-2xl font-bold text-slate-900">Categorías</h2>
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/productos?categoria=${cat.slug}`}
              className="group relative overflow-hidden rounded-xl bg-white shadow-sm transition hover:shadow-md"
            >
              <div className="aspect-[4/3] bg-slate-100">
                {cat.image ? (
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="h-full w-full object-cover transition group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-slate-400">
                    <svg
                      className="h-12 w-12"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="text-lg font-semibold text-slate-900">{cat.name}</h3>
                <p className="mt-1 text-sm text-slate-600">
                  {cat._count?.products ?? 0} productos
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Productos Destacados */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">Productos Destacados</h2>
          <Link
            href="/productos?isFeatured=true"
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            Ver todos →
          </Link>
        </div>
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="rounded-2xl bg-slate-900 px-8 py-16 text-center text-white">
          <h2 className="text-3xl font-bold">¿Buscas algo específico?</h2>
          <p className="mx-auto mt-4 max-w-xl text-slate-300">
            Explora nuestro catálogo completo de productos tecnológicos de las mejores marcas.
          </p>
          <Link
            href="/productos"
            className="mt-8 inline-flex items-center rounded-lg bg-white px-8 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100"
          >
            Explorar Catálogo
          </Link>
        </div>
      </section>
    </div>
  );
}
