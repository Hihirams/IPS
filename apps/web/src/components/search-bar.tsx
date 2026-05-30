'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * Barra de búsqueda con debounce.
 *
 * - Debounce de 400ms
 * - Enter para buscar
 * - Botón X para limpiar
 * - Ctrl+K para focus
 */
export function SearchBar({ variant }: { variant?: 'default' | 'pill' } = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('busqueda') ?? '');
  const [isFocused, setIsFocused] = useState(false);
  const hasUserEditedQuery = useRef(false);

  const performSearch = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value.trim()) {
        params.set('busqueda', value.trim());
      } else {
        params.delete('busqueda');
      }
      params.delete('pagina'); // Reset pagina al buscar
      router.push(`/productos?${params.toString()}`);
    },
    [router, searchParams]
  );

  // Debounce de 400ms
  useEffect(() => {
    if (!hasUserEditedQuery.current) {
      return;
    }

    const timer = setTimeout(() => {
      performSearch(query);
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  // Ctrl+K / Cmd+K para focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('search-input')?.focus();
      }
      if (e.key === 'Escape' && query) {
        hasUserEditedQuery.current = true;
        setQuery('');
        performSearch('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [performSearch]);

  const isPill = variant === 'pill';

  return isPill ? (
    <div className="flex w-full items-center gap-0">
      <svg
        className="h-[15px] w-[15px] shrink-0 text-black/28"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        id="search-input"
        type="text"
        value={query}
        onChange={(e) => {
          hasUserEditedQuery.current = true;
          setQuery(e.target.value);
        }}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder="Buscar productos, marcas, categorías…"
        className="w-full bg-transparent px-2.5 text-sm text-black/80 placeholder:text-black/28 focus:outline-none"
      />
      {query && (
        <button
          onClick={() => {
            hasUserEditedQuery.current = true;
            setQuery('');
            performSearch('');
          }}
          className="rounded p-1 text-black/28 hover:bg-black/5 hover:text-black/50"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  ) : (
    <div className={`relative flex items-center rounded-full border bg-white/60 backdrop-blur-xl transition ${
      isFocused ? 'border-[rgba(0,113,227,0.5)] ring-[3px] ring-[rgba(0,113,227,0.16)]' : 'border-[color:var(--hair)]'
    }`}>
      <svg
        className="ml-3.5 h-5 w-5 text-ink-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        id="search-input"
        type="text"
        value={query}
        onChange={(e) => {
          hasUserEditedQuery.current = true;
          setQuery(e.target.value);
        }}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder="Buscar productos..."
        className="w-full bg-transparent px-3 py-2.5 text-sm text-ink-1 placeholder:text-ink-4 focus:outline-none"
      />
      {query && (
        <button
          onClick={() => {
            hasUserEditedQuery.current = true;
            setQuery('');
            performSearch('');
          }}
          className="mr-2 rounded-full p-1 text-ink-4 transition hover:bg-black/[0.05] hover:text-ink-2"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
      <span className="mr-3 hidden rounded-md bg-black/[0.05] px-1.5 py-0.5 text-xs text-ink-3 sm:block">
        Ctrl+K
      </span>
    </div>
  );
}
