import type { Env } from '@ecommerce/config/env';
import type { Redis } from 'ioredis';
import type { Role as PrismaRole } from '@prisma/client';

type Role = PrismaRole;

/**
 * Declaraciones de tipos para extensiones de Fastify.
 *
 * Este archivo centraliza todos los decorators custom para evitar
 * errores de TypeScript.
 *
 * IMPORTANTE: El tipo de `request.user` se define aqui mediante
 * FastifyJWT interface merging (patron oficial de @fastify/jwt).
 * Esto sobreescribe el tipo por defecto `string | object | Buffer`
 * que @fastify/jwt asigna a `user`.
 */

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      sub: string;
      email?: string;
      role: Role;
      sessionId?: string;
      purpose?: 'mfa';
    };
    user: { id: string; email?: string; role: Role; sessionId?: string };
  }
}

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
  }
}