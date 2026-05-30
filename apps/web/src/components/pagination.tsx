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
 * Componente de paginación con URL params (estilo glass).
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

  const navBtn =
    'flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium transition';

  return (
    <nav className="flex items-center justify-center gap-2">
      <Link
        href={hasPrev ? buildUrl(currentPage - 1) : '#'}
        className={`${navBtn} ${
          hasPrev
            ? 'glass-card text-ink-1 hover:bg-white/90'
            : 'cursor-not-allowed text-ink-4'
        }`}
        aria-disabled={!hasPrev}
      >
        Anterior
      </Link>

      <div className="flex items-center gap-1.5">
        {getPageNumbers().map((page, i) =>
          page === '...' ? (
            <span key={`ellipsis-${i}`} className="px-1.5 text-ink-4">
              …
            </span>
          ) : (
            <Link
              key={page}
              href={buildUrl(page as number)}
              className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition ${
                currentPage === page
                  ? 'bg-black/[0.88] text-white shadow-[0_1px_2px_rgba(0,0,0,0.18)]'
                  : 'glass-card text-ink-2 hover:bg-white/90 hover:text-ink-1'
              }`}
            >
              {page}
            </Link>
          )
        )}
      </div>

      <Link
        href={hasNext ? buildUrl(currentPage + 1) : '#'}
        className={`${navBtn} ${
          hasNext
            ? 'glass-card text-ink-1 hover:bg-white/90'
            : 'cursor-not-allowed text-ink-4'
        }`}
        aria-disabled={!hasNext}
      >
        Siguiente
      </Link>
    </nav>
  );
}
