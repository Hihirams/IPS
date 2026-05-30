import { Suspense } from 'react';
import Link from 'next/link';
import { ProductCard } from '@/components/product-card';
import { ProductGrid } from '@/components/product-grid';
import { FilterSidebar } from '@/components/filter-sidebar';
import { Pagination } from '@/components/pagination';
import { api } from '@/lib/api';
import { DISPLAY_CATEGORIES, findDisplayCategory } from '@/lib/categories';
import type { PublicProduct } from '@ecommerce/types';

interface CatalogPageProps {
  searchParams: Promise<{
    pagina?: string;
    categoria?: string;
    marca?: string;
    minPrecio?: string;
    maxPrecio?: string;
    busqueda?: string;
    soloStock?: string;
    ordenarPor?: string;
    orden?: string;
  }>;
}

export const revalidate = 300;

async function getProducts(searchParams: Awaited<CatalogPageProps['searchParams']>, syscomCategorySlugs?: string[]) {
  const page = Number(searchParams.pagina) || 1;
  const limit = 12;

  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(limit));

  if (syscomCategorySlugs && syscomCategorySlugs.length > 0) {
    params.set('categories', syscomCategorySlugs.join(','));
  }

  if (searchParams.marca) params.set('brand', searchParams.marca);
  if (searchParams.minPrecio) params.set('minPrice', searchParams.minPrecio);
  if (searchParams.maxPrecio) params.set('maxPrice', searchParams.maxPrecio);
  if (searchParams.busqueda) params.set('search', searchParams.busqueda);
  if (searchParams.soloStock === 'true') params.set('inStock', 'true');
  if (searchParams.ordenarPor) params.set('sortBy', searchParams.ordenarPor);
  if (searchParams.orden) params.set('sortOrder', searchParams.orden);

  try {
    const res = await api(`/api/products?${params.toString()}`);
    const json = await res.json();
    return {
      products: (json.data?.data ?? []) as PublicProduct[],
      meta: json.data ?? { total: 0, page: 1, totalPages: 1, hasNext: false, hasPrev: false },
    };
  } catch {
    return {
      products: [] as PublicProduct[],
      meta: { total: 0, page: 1, totalPages: 1, hasNext: false, hasPrev: false },
    };
  }
}

async function getCategories() {
  try {
    const res = await api('/api/categories');
    const json = await res.json();
    return json.data ?? [];
  } catch {
    return [];
  }
}

async function getBrands(syscomCategorySlugs?: string[], search?: string) {
  try {
    const params = new URLSearchParams();
    if (syscomCategorySlugs && syscomCategorySlugs.length > 0) {
      params.set('categories', syscomCategorySlugs.join(','));
    }
    if (search) params.set('search', search);
    const qs = params.toString();
    const res = await api(qs ? `/api/brands?${qs}` : '/api/brands');
    const json = await res.json();
    return json.data ?? [];
  } catch {
    return [];
  }
}

function resolveDisplayCategoryToSyscomSlugs(
  displaySlug: string,
  allCategories: Array<{ name: string; slug: string }>
): string[] {
  const dc = DISPLAY_CATEGORIES.find((c) => c.slug === displaySlug);
  if (!dc) return [];

  const slugs: string[] = [];
  for (const cat of allCategories) {
    const matched = findDisplayCategory(cat.name);
    if (matched && matched.slug === dc.slug) {
      slugs.push(cat.slug);
    }
  }
  return slugs;
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const params = await searchParams;
  const categories = await getCategories();

  const syscomSlugs = params.categoria
    ? resolveDisplayCategoryToSyscomSlugs(params.categoria, categories)
    : undefined;

  // Marcas filtradas al contexto actual (categoría + búsqueda)
  const brands = await getBrands(syscomSlugs, params.busqueda);

  const { products, meta } = await getProducts(params, syscomSlugs);

  const currentPage = meta.page;

  const displayCat = params.categoria
    ? DISPLAY_CATEGORIES.find((c) => c.slug === params.categoria)
    : undefined;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <nav className="animate-fade-in mb-6 text-sm text-ink-3">
        <Link href="/" className="transition hover:text-ink-1">Inicio</Link>
        <span className="mx-2">/</span>
        <Link href="/productos" className="transition hover:text-ink-1">Productos</Link>
        {displayCat && (
          <>
            <span className="mx-2">/</span>
            <span className="text-ink-1">{displayCat.icon} {displayCat.name}</span>
          </>
        )}
      </nav>

      <div className="flex flex-col gap-8 lg:flex-row">
        <aside className="w-full shrink-0 lg:w-64">
          <Suspense fallback={null}>
            <FilterSidebar
              categories={categories}
              brands={brands}
              searchParams={params}
            />
          </Suspense>
        </aside>

        <div className="flex-1">
          <div className="mb-5 flex items-center justify-between">
            <h1 className="text-2xl font-semibold tracking-tight text-ink-1">
              {params.busqueda
                ? `Resultados para "${params.busqueda}"`
                : displayCat
                  ? `${displayCat.icon} ${displayCat.name}`
                  : 'Todos los productos'}
            </h1>
            <span className="chip">{meta.total} resultados</span>
          </div>

          <Suspense
            fallback={
              <ProductGrid isLoading columns={3} />
            }
          >
            {products.length > 0 ? (
              <>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {products.map((product, i) => (
                    <div key={product.id} className={`animate-fade-up delay-${Math.min(i, 8)}`}>
                      <ProductCard product={product} />
                    </div>
                  ))}
                </div>

                <div className="mt-8">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={meta.totalPages}
                    hasNext={meta.hasNext}
                    hasPrev={meta.hasPrev}
                    baseUrl="/productos"
                    searchParams={params}
                  />
                </div>
              </>
            ) : (
              <div className="glass-card animate-scale-in rounded-[22px] py-16 text-center">
                <p className="text-lg text-ink-2">No se encontraron productos.</p>
                <Link href="/productos" className="btn-secondary mt-5 px-5 py-2.5">
                  Limpiar filtros
                </Link>
              </div>
            )}
          </Suspense>
        </div>
      </div>
    </div>
  );
}
