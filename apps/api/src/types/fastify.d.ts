import type { Env } from '@ecommerce/config/env';
import type { Redis } from 'ioredis';

/**
 * Declaraciones de tipos para extensiones de Fastify.
 *
 * Este archivo centraliza todos los decorators custom para evitar
 * errores de TypeScript.
 */

declare module 'fastify' {
  interface FastifyInstance {
    /** Configuración de entorno validada */
    config: Env;

    /** Cliente Redis (de @fastify/redis) */
    redis: Redis;

    /** Generador de tokens CSRF */
    generateCsrfToken: () => string;
  }

  interface FastifyRequest {
    /** Validador Zod */
    validate: (
      schema: import('zod').ZodSchema,
      target?: 'body' | 'params' | 'query'
    ) => unknown;

    /** Usuario autenticado (del middleware auth) */
    user?: import('./middleware/auth.middleware').AuthenticatedUser;
  }
}
