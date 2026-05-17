import { env } from 'process';

/**
 * Helper para hacer fetch a la API del backend.
 *
 * En desarrollo usa la URL local, en producción la URL del API.
 * Incluye revalidación para cache de Next.js.
 */

const API_URL = env.API_URL || 'http://localhost:4000';

/**
 * Wrapper de fetch para la API del backend.
 * Agrega headers comunes y maneja errores.
 * Usado en Server Components (sin auth token).
 */
export async function api(
  path: string,
  options?: RequestInit & { next?: { revalidate?: number } }
): Promise<Response> {
  const url = `${API_URL}${path}`;

  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    next: {
      revalidate: options?.next?.revalidate ?? 300,
      ...options?.next,
    },
  });
}

/**
 * Wrapper de fetch para la API con autenticación.
 * Incluye el token de acceso en el header Authorization.
 * Usado en Client Components y Server Actions.
 */
export async function apiWithAuth(
  path: string,
  token: string,
  options?: RequestInit
): Promise<Response> {
  const url = `${API_URL}${path}`;

  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });
}
