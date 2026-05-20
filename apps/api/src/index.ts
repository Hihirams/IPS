import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

import Fastify from 'fastify';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import formbody from '@fastify/formbody';

import { validateEnv, getServerPort } from '@ecommerce/config/env';
import { setupLogger } from './plugins/logger';
import securityPlugin from './plugins/security';
import validationPlugin from './plugins/validation';
import csrfPlugin from './plugins/csrf';
import { healthRoutes } from './routes/health';
import { cspReportRoutes } from './routes/csp-report';
import { authRoutes } from './modules/auth/auth.routes';
import { productRoutes } from './modules/products/products.routes';
import { cartRoutes } from './modules/cart/cart.routes';
import { checkoutRoutes } from './modules/checkout/checkout.routes';
import { orderRoutes } from './modules/orders/order.routes';
import { adminRoutes } from './modules/admin/admin.routes';
import { userRoutes } from './modules/user/user.routes';
import { gdprRoutes } from './modules/gdpr/gdpr.routes';
import { syncRoutes } from './modules/sync/sync.routes';
import { sentryPlugin } from './services/monitoring.service';
import { startStripeIntegrityCron } from './services/script-integrity.service';

async function bootstrap() {
  // Validar variables de entorno antes de arrancar
  const env = validateEnv(process.env);

  const logger = setupLogger(env.NODE_ENV);

  const app = Fastify({
    logger,
    trustProxy: true,
  });

  // Exponer config para que plugins la usen
  app.decorate('config', env);

  // ==========================================
  // Plugins de parsing de body
  // ==========================================
  await app.register(formbody);

  // ==========================================
  // Raw body parser para webhooks de Stripe
  // Stripe necesita el body sin parsear para verificar la firma.
  // SECURITY FIX: Antes este parser afectaba TODAS las rutas (global),
  // causando que todos los endpoints recibieran strings en vez de JSON.
  // Ahora: solo la ruta /api/webhooks/stripe recibe raw string;
  // todas las demás reciben JSON parseado normalmente.
  // ==========================================
  app.addContentTypeParser(
    'application/json',
    { parseAs: 'string' },
    (req, body, done) => {
      if (req.url === '/api/webhooks/stripe') {
        done(null, body);
      } else {
        try {
          done(null, JSON.parse(body as string));
        } catch {
          done(new Error('Invalid JSON'), undefined);
        }
      }
    }
  );

  // ==========================================
  // JWT (acceso y refresh tokens)
  // ==========================================
  await app.register(jwt, {
    secret: env.JWT_SECRET,
    cookie: {
      cookieName: 'refreshToken',
      signed: false,
    },
  });

  // ==========================================
  // Cookies (httpOnly para refresh token)
  // ==========================================
  await app.register(cookie, {
    secret: env.CSRF_SECRET, // Para firmar cookies (opcional)
    parseOptions: {},
  });

  // ==========================================
  // Plugins de seguridad (Helmet, CORS, Rate Limit, Redis)
  // ==========================================
  await app.register(securityPlugin);

  // ==========================================
  // Plugin de validación Zod
  // ==========================================
  await app.register(validationPlugin);

  // ==========================================
  // Plugin de protección CSRF
  // ==========================================
  await app.register(csrfPlugin);

  // ==========================================
  // Plugin de monitoring (Sentry)
  // ==========================================
  await app.register(sentryPlugin);

  // ==========================================
  // Rutas
  // ==========================================
  await app.register(healthRoutes, { prefix: '/api/health' });
  await app.register(cspReportRoutes);
  await app.register(authRoutes);
  await app.register(productRoutes);
  await app.register(cartRoutes);
  await app.register(checkoutRoutes);
  await app.register(orderRoutes);
  await app.register(adminRoutes);
  await app.register(userRoutes);
  await app.register(gdprRoutes);
  await app.register(syncRoutes);

  // ==========================================
  // Manejo de errores global
  // ==========================================
  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);

    // Si el error ya tiene formato de respuesta de API, pasarlo tal cual
    if (error.statusCode && error.statusCode < 500) {
      return reply.status(error.statusCode).send({
        success: false,
        error: {
          code: 'REQUEST_ERROR',
          message: error.message || 'Solicitud inválida.',
        },
      });
    }

    return reply.status(500).send({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Ocurrió un error interno. Por favor intenta más tarde.',
      },
    });
  });

  // ==========================================
  // Iniciar servidor
  // ==========================================
  const port = getServerPort(env);

  try {
    await app.listen({ port, host: '0.0.0.0' });
    app.log.info(`🚀 API escuchando en http://0.0.0.0:${port}`);

    // Iniciar cron de verificación de integridad de scripts (anti-Magecart)
    // SECURITY: Monitorea que stripe.js no haya sido modificado por un atacante
    startStripeIntegrityCron(app);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

bootstrap();
