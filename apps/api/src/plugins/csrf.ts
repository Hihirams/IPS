import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import crypto from 'crypto';

/**
 * Plugin de protección CSRF con doble-submit cookie pattern.
 *
 * 1. Genera un token CSRF aleatorio
 * 2. Lo envía en cookie (accesible desde JS para header) y en respuesta
 * 3. En mutaciones (POST/PUT/PATCH/DELETE), verifica que el header X-CSRF-Token
 *    coincida con la cookie csrf-token
 *
 * Exenciones:
 * - Rutas GET/HEAD/OPTIONS (no son mutaciones)
 * - Rutas que empiecen con /api/webhooks/ (Stripe usa firma propia)
 */

const CSRF_COOKIE_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_TOKEN_LENGTH = 32; // bytes

export default fp(async function csrfPlugin(app: FastifyInstance) {
  // ==========================================
  // Decorator: genera un token CSRF nuevo
  // ==========================================
  app.decorate('generateCsrfToken', function () {
    return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
  });

  // ==========================================
  // Ruta GET para obtener token CSRF
  // ==========================================
  app.get('/api/auth/csrf-token', async (request, reply) => {
    const token = crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');

    // Setear cookie (NO httpOnly, para que JS pueda leerla)
    reply.setCookie(CSRF_COOKIE_NAME, token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 dias
    });

    return { csrfToken: token };
  });

  // ==========================================
  // Hook global: verificar CSRF en mutaciones
  // ==========================================
  app.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    const method = request.method;
    const url = request.url;

    // Eximir GET/HEAD/OPTIONS (no mutaciones)
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return;
    }

    // Eximir webhooks de Stripe (usan firma propia)
    if (url.startsWith('/api/webhooks/')) {
      return;
    }

    // Eximir rutas de auth que no requieren CSRF en ciertos flujos
    // (login/register/refresh en flujo inicial antes de tener CSRF token)
    // NOTA: En producción estricta, incluso estas rutas deberían tener CSRF.
    //       Para este MVP, las eximimos del check para permitir el flujo inicial.
    if (
      url === '/api/auth/login' ||
      url === '/api/auth/register' ||
      url === '/api/auth/refresh'
    ) {
      return;
    }

    // Leer token de cookie y header
    const cookieToken = request.cookies[CSRF_COOKIE_NAME];
    const headerToken = request.headers[CSRF_HEADER_NAME];

    if (!cookieToken || !headerToken) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'CSRF_MISSING',
          message: 'Token CSRF faltante. Por favor obtén un token CSRF primero.',
        },
      });
    }

    // Comparación timing-safe
    try {
      const cookieBuf = Buffer.from(cookieToken, 'utf8');
      const headerBuf = Buffer.from(String(headerToken), 'utf8');

      if (cookieBuf.length !== headerBuf.length) {
        return reply.status(403).send({
          success: false,
          error: {
            code: 'CSRF_INVALID',
            message: 'Token CSRF inválido.',
          },
        });
      }

      if (!crypto.timingSafeEqual(cookieBuf, headerBuf)) {
        return reply.status(403).send({
          success: false,
          error: {
            code: 'CSRF_INVALID',
            message: 'Token CSRF inválido.',
          },
        });
      }
    } catch {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'CSRF_INVALID',
          message: 'Token CSRF inválido.',
        },
      });
    }
  });
});

// Type declaration
declare module 'fastify' {
  interface FastifyInstance {
    generateCsrfToken: () => string;
  }
}
