'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { DISPLAY_CATEGORIES, findDisplayCategory } from '@/lib/categories';

interface FilterSidebarProps {
  categories: Array<Record<string, unknown>>;
  brands: Array<Record<string, unknown>>;
  searchParams: Record<string, string | undefined>;
}

export function FilterSidebar({ categories, brands, searchParams }: FilterSidebarProps) {
  const router = useRouter();
  const currentParams = useSearchParams();

  const displayCats = computeDisplayCategories(categories);

  const updateFilters = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(currentParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '' || value === 'false') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    params.delete('pagina');

    router.push(`/productos?${params.toString()}`);
  };

  const clearFilters = () => {
    router.push('/productos');
  };

  const hasFilters =
    searchParams.categoria ||
    searchParams.marca ||
    searchParams.minPrecio ||
    searchParams.maxPrecio ||
    searchParams.soloStock;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-900">Filtros</h2>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            Limpiar
          </button>
        )}
      </div>

      {displayCats.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-medium text-slate-900">Categorías</h3>
          <div className="space-y-2">
            {displayCats.map((dc) => (
              <label
                key={dc.slug}
                className="flex cursor-pointer items-center gap-2 text-sm"
              >
                <input
                  type="radio"
                  name="categoria"
                  className="border-slate-300 text-slate-900 focus:ring-slate-900"
                  checked={searchParams.categoria === dc.slug}
                  onChange={(e) =>
                    updateFilters({
                      categoria: e.target.checked ? dc.slug : null,
                    })
                  }
                />
                <span className="text-slate-700">
                  {dc.icon} {dc.name}
                </span>
                <span className="ml-auto text-xs text-slate-400">
                  {dc.productCount}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {brands.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-medium text-slate-900">Marcas</h3>
          <div className="space-y-2">
            {brands.map((brand) => (
              <label
                key={brand.id as string}
                className="flex cursor-pointer items-center gap-2 text-sm"
              >
                <input
                  type="radio"
                  name="marca"
                  className="border-slate-300 text-slate-900 focus:ring-slate-900"
                  checked={searchParams.marca === (brand.slug as string)}
                  onChange={(e) =>
                    updateFilters({
                      marca: e.target.checked ? (brand.slug as string) : null,
                    })
                  }
                />
                <span className="text-slate-700">{brand.name as string}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="mb-3 text-sm font-medium text-slate-900">Precio</h3>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Min"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={searchParams.minPrecio ?? ''}
            onChange={(e) =>
              updateFilters({ minPrecio: e.target.value || null })
            }
          />
          <span className="text-slate-400">-</span>
          <input
            type="number"
            placeholder="Max"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={searchParams.maxPrecio ?? ''}
            onChange={(e) =>
              updateFilters({ maxPrecio: e.target.value || null })
            }
          />
        </div>
      </div>

      <div>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
            checked={searchParams.soloStock === 'true'}
            onChange={(e) =>
              updateFilters({
                soloStock: e.target.checked ? 'true' : null,
              })
            }
          />
          <span className="text-slate-700">Solo disponibles</span>
        </label>
      </div>
    </div>
  );
}

function computeDisplayCategories(
  categories: Array<Record<string, unknown>>
): Array<{ slug: string; name: string; icon: string; productCount: number; syscomSlugs: string[] }> {
  const map = new Map<string, { productCount: number; syscomSlugs: string[] }>();

  for (const dc of DISPLAY_CATEGORIES) {
    map.set(dc.slug, { productCount: 0, syscomSlugs: [] });
  }

  for (const cat of categories) {
    const name = (cat.name as string) ?? '';
    const slug = (cat.slug as string) ?? '';
    const count = (cat._count as Record<string, number> | undefined)?.products ?? 0;
    const dc = findDisplayCategory(name);

    if (dc) {
      const entry = map.get(dc.slug)!;
      entry.productCount += count;
      entry.syscomSlugs.push(slug);
    }
  }

  return DISPLAY_CATEGORIES.filter((dc) => (map.get(dc.slug)?.productCount ?? 0) > 0).map((dc) => {
    const entry = map.get(dc.slug)!;
    return {
      slug: dc.slug,
      name: dc.name,
      icon: dc.icon,
      productCount: entry.productCount,
      syscomSlugs: entry.syscomSlugs,
    };
  });
}