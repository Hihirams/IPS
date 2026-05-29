import Fastify from 'fastify';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import type { FastifyInstance } from 'fastify';

/**
 * Helper para crear una instancia de Fastify de test.
 *
 * Configura:
 * - JWT con secret de test
 * - Cookies
 * - Redis mock (in-memory)
 * - Plugins de seguridad básicos
 */

interface MockRedis {
  store: Map<string, { value: string; expiry?: number }>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  setex(key: string, seconds: number, value: string): Promise<void>;
  del(key: string): Promise<void>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<void>;
  exists(key: string): Promise<number>;
}

function createMockRedis(): MockRedis {
  const store = new Map<string, { value: string; expiry?: number }>();

  return {
    store,
    async get(key: string) {
      const item = store.get(key);
      if (!item) return null;
      if (item.expiry && Date.now() > item.expiry) {
        store.delete(key);
        return null;
      }
      return item.value;
    },
    async set(key: string, value: string) {
      store.set(key, { value });
    },
    async setex(key: string, seconds: number, value: string) {
      store.set(key, { value, expiry: Date.now() + seconds * 1000 });
    },
    async del(key: string) {
      store.delete(key);
    },
    async incr(key: string) {
      const current = parseInt(store.get(key)?.value ?? '0', 10);
      const next = current + 1;
      store.set(key, { value: next.toString() });
      return next;
    },
    async expire(key: string, seconds: number) {
      const item = store.get(key);
      if (item) {
        item.expiry = Date.now() + seconds * 1000;
      }
    },
    async exists(key: string) {
      const item = store.get(key);
      if (!item) return 0;
      if (item.expiry && Date.now() > item.expiry) {
        store.delete(key);
        return 0;
      }
      return 1;
    },
  };
}

export async function buildTestApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: false, // Silenciar logs en tests
    maxParamLength: 500, // Igual que producción: soportar slugs largos de SYSCOM
  });

  // Mock config
  app.decorate('config', {
    JWT_SECRET: process.env.JWT_SECRET!,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET!,
    CSRF_SECRET: process.env.CSRF_SECRET!,
    NODE_ENV: 'test',
    EMAIL_FROM: 'test@example.com',
  });

  // JWT
  await app.register(jwt, {
    secret: process.env.JWT_SECRET!,
    cookie: { cookieName: 'refreshToken', signed: false },
  });

  // Cookies
  await app.register(cookie, {
    secret: process.env.CSRF_SECRET!,
    parseOptions: {},
  });

  // Mock Redis
  const mockRedis = createMockRedis();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.decorate('redis', mockRedis as any);

  return app;
}

/**
 * Genera un JWT de test válido.
 */
export async function generateTestToken(
  app: FastifyInstance,
  userId: string,
  role: string = 'USER',
  sessionId?: string
): Promise<string> {
  return app.jwt.sign({
    sub: userId,
    email: 'test@example.com',
    role: role as import('@prisma/client').Role,
    sessionId: sessionId ?? 'test-session-id',
  });
}
