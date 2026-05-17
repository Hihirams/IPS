import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import redisPlugin from '@fastify/redis';

/**
 * Plugin de seguridad base para Fastify.
 *
 * Registra:
 * 1. @fastify/helmet con CSP estricta
 * 2. @fastify/cors con origen configurable
 * 3. @fastify/rate-limit con store Redis y tiers por ruta
 */
export default fp(async function securityPlugin(app: FastifyInstance) {
  const env = app.config; // Variables de entorno validadas

  // ==========================================
  // 1. Redis (requerido para rate limit store)
  // ==========================================
  await app.register(redisPlugin, {
    url: env.REDIS_URL,
  });

  // ==========================================
  // 2. Helmet con CSP estricta
  // ==========================================
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", 'https://js.stripe.com', 'https://js.stripe.com/v3/'],
        frameSrc: ['https://js.stripe.com'],
        connectSrc: ["'self'", 'https://api.stripe.com'],
        imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com'],
        styleSrc: ["'self'", "'unsafe-inline'"],
        fontSrc: ["'self'", 'data:'],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false, // Necesario para Stripe iframe
  });

  // ==========================================
  // 3. CORS
  // ==========================================
  const corsOrigins = env.CORS_ORIGIN.split(',').map((origin: string) => origin.trim()).filter(Boolean);

  await app.register(cors, {
    origin: corsOrigins.length > 1 ? corsOrigins : corsOrigins[0],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
    maxAge: 86400,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-CSRF-Token',
      'X-Requested-With',
    ],
  });

  // ==========================================
  // 4. Rate Limiting global + tiers por ruta
  // ==========================================
  await app.register(rateLimit, {
    global: true,
    max: 100,
    timeWindow: '1 minute',
    redis: app.redis,
    keyGenerator: (_req) => {
      // Usar IP real (respeta trustProxy)
      return _req.ip || 'unknown';
    },
    errorResponseBuilder: (_req, context) => {
      // Incluir header Retry-After
      const retryAfter = Math.ceil(context.ttl / 1000);
      return {
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Demasiadas solicitudes. Por favor intenta más tarde.',
          retryAfter,
        },
      };
    },
  });

  // Decorator para acceso directo al store de rate limit
  app.decorate('rateLimitStore', app.redis);
});
