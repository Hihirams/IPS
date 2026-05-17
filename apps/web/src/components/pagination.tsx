'use client';

import Link from 'next/link';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  baseUrl: string;
  searchParams: Record<string, string | undefined>;
}

/**
 * Componente de paginación con URL params.
 *
 * Muestra botones anterior/siguiente y números de página con ellipsis.
 */
export function Pagination({
  currentPage,
  totalPages,
  hasNext,
  hasPrev,
  baseUrl,
  searchParams,
}: PaginationProps) {
  const buildUrl = (page: number) => {
    const params = new URLSearchParams();
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value && key !== 'pagina') {
        params.set(key, value);
      }
    });
    params.set('pagina', String(page));
    return `${baseUrl}?${params.toString()}`;
  };

  // Generar array de números de página con ellipsis
  const getPageNumbers = (): (number | string)[] => {
    const pages: (number | string)[] = [];
    const delta = 1;

    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - delta && i <= currentPage + delta)
      ) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== '...') {
        pages.push('...');
      }
    }

    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <nav className="flex items-center justify-center gap-2">
      {/* Anterior */}
      <Link
        href={hasPrev ? buildUrl(currentPage - 1) : '#'}
        className={`rounded-lg border px-4 py-2 text-sm font-medium ${
          hasPrev
            ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            : 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed'
        }`}
        aria-disabled={!hasPrev}
      >
        Anterior
      </Link>

      {/* Números de página */}
      <div className="flex items-center gap-1">
        {getPageNumbers().map((page, i) =>
          page === '...' ? (
            <span key={`ellipsis-${i}`} className="px-2 text-slate-400">
              ...
            </span>
          ) : (
            <Link
              key={page}
              href={buildUrl(page as number)}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${
                currentPage === page
                  ? 'bg-slate-900 text-white'
                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {page}
            </Link>
          )
        )}
      </div>

      {/* Siguiente */}
      <Link
        href={hasNext ? buildUrl(currentPage + 1) : '#'}
        className={`rounded-lg border px-4 py-2 text-sm font-medium ${
          hasNext
            ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            : 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed'
        }`}
        aria-disabled={!hasNext}
      >
        Siguiente
      </Link>
    </nav>
  );
}
