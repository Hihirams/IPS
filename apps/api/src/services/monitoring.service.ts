import type { FastifyInstance } from 'fastify';
import * as Sentry from '@sentry/node';

/**
 * Servicio de monitoring con Sentry.
 *
 * Inicializa Sentry para capturar excepciones no manejadas,
 * con sanitización de datos sensibles y alertas configuradas.
 *
 * SECURITY:
 * - scrubFields: elimina campos sensibles antes de enviar a Sentry.
 * - ignoreErrors: evita ruido de errores esperados (401, 404, rate limit).
 * - NUNCA enviar: passwords, tokens, datos de tarjeta, CVV.
 */

const SENSITIVE_FIELDS = [
  'password',
  'passwordHash',
  'token',
  'refreshToken',
  'accessToken',
  'stripeKey',
  'stripeSecretKey',
  'creditCard',
  'cardNumber',
  'cvv',
  'cvc',
  'authorization',
  'cookie',
  'mfaSecret',
  'AES_PHONE_KEY',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'CSRF_SECRET',
];

let isInitialized = false;

export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    console.warn('[Sentry] SENTRY_DSN no configurado. Sentry está desactivado.');
    return;
  }

  if (isInitialized) return;

  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? 'development',
    // Solo capturar errores 500+ y excepciones no manejadas
    beforeSend(event) {
      // Sanitizar datos sensibles
      const sanitize = (obj: Record<string, unknown> | unknown): unknown => {
        if (!obj || typeof obj !== 'object') return obj;
        const result: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(obj)) {
          if (SENSITIVE_FIELDS.some((f) => key.toLowerCase().includes(f.toLowerCase()))) {
            result[key] = '[REDACTED]';
          } else if (typeof value === 'object' && value !== null) {
            result[key] = sanitize(value);
          } else {
            result[key] = value;
          }
        }
        return result;
      };

      if (event.request?.data) {
        event.request.data = sanitize(event.request.data as Record<string, unknown>) as Record<string, unknown>;
      }
      if (event.extra) {
        event.extra = sanitize(event.extra) as unknown as typeof event.extra;
      }
      if (event.tags) {
        event.tags = sanitize(event.tags) as unknown as typeof event.tags;
      }

      return event;
    },
    // Ignorar errores esperados (no son bugs)
    ignoreErrors: [
      'UNAUTHORIZED',
      'INVALID_CREDENTIALS',
      'RATE_LIMIT_EXCEEDED',
      'REQUEST_ERROR',
      'VALIDATION_ERROR',
      'FORBIDDEN',
      'MFA_REQUIRED',
      'ADMIN_SESSION_EXPIRED',
      'Not Found',
      'Unauthorized',
    ],
    // Sample rate: 100% de errores, 10% de transacciones (ajustar en producción)
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 0.0,
  });

  isInitialized = true;
  console.log('[Sentry] Inicializado correctamente.');
}

/**
 * Captura una excepción en Sentry (si está configurado).
 */
export function captureException(error: Error, context?: Record<string, unknown>): void {
  if (!isInitialized || !process.env.SENTRY_DSN) return;

  Sentry.withScope((scope) => {
    if (context) {
      for (const [key, value] of Object.entries(context)) {
        scope.setExtra(key, value);
      }
    }
    Sentry.captureException(error);
  });
}

/**
 * Captura un mensaje en Sentry.
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info'): void {
  if (!isInitialized || !process.env.SENTRY_DSN) return;
  Sentry.captureMessage(message, level);
}

/**
 * Plugin de Fastify para Sentry: captura errores 500+ automáticamente.
 */
export async function sentryPlugin(app: FastifyInstance): Promise<void> {
  initSentry();

  // Hook: capturar errores en respuestas 500+
  app.addHook('onSend', async (request, reply) => {
    if (reply.statusCode >= 500 && isInitialized) {
      const error = new Error(`HTTP ${reply.statusCode} en ${request.method} ${request.url}`);
      captureException(error, {
        url: request.url,
        method: request.method,
        statusCode: reply.statusCode,
        userId: (request.user as { id?: string } | undefined)?.id,
        ip: request.ip,
      });
    }
  });

  // Hook: capturar errores no manejados
  app.addHook('onError', async (request, reply, error) => {
    if (isInitialized && reply.statusCode >= 500) {
      captureException(error, {
        url: request.url,
        method: request.method,
        statusCode: reply.statusCode,
        userId: (request.user as { id?: string } | undefined)?.id,
        ip: request.ip,
      });
    }
  });
}
