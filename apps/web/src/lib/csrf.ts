/**
 * Cliente HTTP con proteccion CSRF (doble-submit cookie).
 *
 * Obten el token con fetchCsrfToken() tras login o al cargar sesion.
 * apiFetch anade X-CSRF-Token en POST/PATCH/PUT/DELETE.
 */

let csrfToken: string | null = null;

export async function fetchCsrfToken(): Promise<string> {
  const res = await fetch('/api/auth/csrf-token', { credentials: 'include' });
  if (!res.ok) {
    throw new Error('No se pudo obtener el token CSRF');
  }
  const data = (await res.json()) as { csrfToken: string };
  csrfToken = data.csrfToken;
  return csrfToken;
}

export function getCsrfToken(): string | null {
  return csrfToken;
}

export function clearCsrfToken(): void {
  csrfToken = null;
}

async function ensureCsrfToken(): Promise<void> {
  if (!csrfToken) {
    await fetchCsrfToken();
  }
}

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * fetch con credentials y header CSRF en mutaciones.
 */
export async function apiFetch(
  input: string,
  init?: RequestInit
): Promise<Response> {
  const method = (init?.method ?? 'GET').toUpperCase();
  const headers = new Headers(init?.headers);

  if (MUTATING_METHODS.has(method)) {
    await ensureCsrfToken();
    if (csrfToken) {
      headers.set('X-CSRF-Token', csrfToken);
    }
  }

  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(input, {
    ...init,
    method,
    headers,
    credentials: init?.credentials ?? 'include',
  });
}