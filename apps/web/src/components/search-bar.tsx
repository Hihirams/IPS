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
export function SearchBar() {
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

  return (
    <div className={`relative flex items-center rounded-lg border bg-white transition ${
      isFocused ? 'border-slate-900 ring-1 ring-slate-900' : 'border-slate-200'
    }`}>
      <svg
        className="ml-3 h-5 w-5 text-slate-400"
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
        className="w-full bg-transparent px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
      />
      {query && (
        <button
          onClick={() => {
            hasUserEditedQuery.current = true;
            setQuery('');
            performSearch('');
          }}
          className="mr-2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
      <span className="mr-3 hidden rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500 sm:block">
        Ctrl+K
      </span>
    </div>
  );
}
