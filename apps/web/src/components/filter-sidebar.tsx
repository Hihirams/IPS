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
    <div className="glass-card sticky top-[98px] space-y-6 rounded-[22px] p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-tight text-ink-1">Filtros</h2>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="rounded-full px-2.5 py-1 text-xs font-medium text-ink-2 transition hover:bg-black/[0.04] hover:text-ink-1"
          >
            Limpiar
          </button>
        )}
      </div>

      {displayCats.length > 0 && (
        <div>
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.5px] text-ink-4">Categorías</h3>
          <div className="space-y-1">
            {displayCats.map((dc) => (
              <label
                key={dc.slug}
                className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2 py-1.5 text-sm transition hover:bg-black/[0.04]"
              >
                <input
                  type="radio"
                  name="categoria"
                  className="h-4 w-4 accent-[#0071e3]"
                  checked={searchParams.categoria === dc.slug}
                  onChange={(e) =>
                    updateFilters({
                      categoria: e.target.checked ? dc.slug : null,
                    })
                  }
                />
                <span className="text-ink-2">
                  {dc.icon} {dc.name}
                </span>
                <span className="ml-auto text-xs text-ink-4">
                  {dc.productCount}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {brands.length > 0 && (
        <div>
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.5px] text-ink-4">Marcas</h3>
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {brands.map((brand) => (
              <label
                key={brand.id as string}
                className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2 py-1.5 text-sm transition hover:bg-black/[0.04]"
              >
                <input
                  type="radio"
                  name="marca"
                  className="h-4 w-4 accent-[#0071e3]"
                  checked={searchParams.marca === (brand.slug as string)}
                  onChange={(e) =>
                    updateFilters({
                      marca: e.target.checked ? (brand.slug as string) : null,
                    })
                  }
                />
                <span className="text-ink-2">{brand.name as string}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.5px] text-ink-4">Precio</h3>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Min"
            className="field"
            value={searchParams.minPrecio ?? ''}
            onChange={(e) =>
              updateFilters({ minPrecio: e.target.value || null })
            }
          />
          <span className="text-ink-4">–</span>
          <input
            type="number"
            placeholder="Max"
            className="field"
            value={searchParams.maxPrecio ?? ''}
            onChange={(e) =>
              updateFilters({ maxPrecio: e.target.value || null })
            }
          />
        </div>
      </div>

      <div className="border-t border-[color:var(--hair)] pt-4">
        <label className="flex cursor-pointer items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 rounded accent-[#0071e3]"
            checked={searchParams.soloStock === 'true'}
            onChange={(e) =>
              updateFilters({
                soloStock: e.target.checked ? 'true' : null,
              })
            }
          />
          <span className="text-ink-2">Solo disponibles</span>
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