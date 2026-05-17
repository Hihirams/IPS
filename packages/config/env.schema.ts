import { z } from 'zod';

/**
 * Esquema de validación de variables de entorno para el ecommerce.
 *
 * Este schema valida TODAS las variables de entorno al startup.
 * Falle con mensaje claro si falta alguna variable crítica.
 * Distingue entre variables de producción y desarrollo.
 *
 * Uso en /apps/api/src/index.ts:
 *   import { validateEnv } from '@ecommerce/config/env';
 *   const env = validateEnv(process.env);
 *   // env es tipado y seguro para usar en toda la aplicación
 */

const envSchema = z.object({
  // Base de datos (siempre requeridas)
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatoria'),
  REDIS_URL: z.string().min(1, 'REDIS_URL es obligatoria'),

  // Autenticación JWT (siempre requeridas)
  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, 'JWT_REFRESH_SECRET debe tener al menos 32 caracteres'),

  // Stripe (siempre requeridas)
  STRIPE_SECRET_KEY: z.string().min(1, 'STRIPE_SECRET_KEY es obligatoria'),
  STRIPE_WEBHOOK_SECRET: z
    .string()
    .min(1, 'STRIPE_WEBHOOK_SECRET es obligatoria'),

  // CSRF (requerida: usada para firmar cookies de protección CSRF)
  CSRF_SECRET: z.string().min(16, 'CSRF_SECRET debe tener al menos 16 caracteres'),

  // Cifrado AES (teléfono y MFA secret)
  AES_PHONE_KEY: z.string().min(16, 'AES_PHONE_KEY debe tener al menos 16 caracteres'),
  MFA_SECRET_KEY: z.string().min(16, 'MFA_SECRET_KEY debe tener al menos 16 caracteres'),

  // Variables con valor por defecto en desarrollo
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('4000'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  RATE_LIMIT_WINDOW_MS: z.string().default('900000'),
  RATE_LIMIT_MAX: z.string().default('100'),

  // Cloudinary
  CLOUDINARY_URL: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  // Email (Resend)
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().email().default('noreply@ecommercetech.com'),

  // Monitoring y Alertas (Sentry)
  SENTRY_DSN: z.string().optional(),
  SENTRY_ENVIRONMENT: z.string().default('development'),

  // Cloudflare (WAF / IP blocking)
  CLOUDFLARE_API_TOKEN: z.string().optional(),
  CLOUDFLARE_ZONE_ID: z.string().optional(),

  // Alertas Slack
  SLACK_WEBHOOK_URL: z.string().url().optional(),

  // Hash SHA-384 de stripe.js para monitoreo de integridad (anti-Magecart)
  STRIPE_JS_HASH: z.string().optional(),

  // Variables requeridas solo si estamos en producción
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
});

/**
 * Variables que son obligatorias en producción pero opcionales en desarrollo.
 */
const productionOnlySchema = z.object({
  STRIPE_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Valida las variables de entorno.
 * Lanza un error claro si falta alguna variable crítica.
 */
export function validateEnv(rawEnv: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(rawEnv);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    throw new Error(
      `❌ Variables de entorno inválidas o faltantes:\n${issues}\n\n` +
        `Por favor, revisa tu archivo .env y asegúrate de que todas las variables estén definidas.\n` +
        `Consulta .env.example para ver la lista completa.`
    );
  }

  const env = result.data;

  // En producción, validar variables adicionales
  if (env.NODE_ENV === 'production') {
    const prodResult = productionOnlySchema.safeParse(rawEnv);
    if (!prodResult.success) {
      const issues = prodResult.error.issues
        .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
        .join('\n');

      throw new Error(
        `❌ Variables de producción faltantes:\n${issues}\n\n` +
          `Estas variables son obligatorias cuando NODE_ENV=production.`
      );
    }
  }

  return env;
}

/**
 * Helper para obtener el puerto numérico del servidor.
 */
export function getServerPort(env: Env): number {
  const port = parseInt(env.PORT, 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new Error(`PORT inválido: ${env.PORT}`);
  }
  return port;
}

/**
 * Helper para obtener la configuración de rate limiting.
 */
export function getRateLimitConfig(env: Env) {
  return {
    windowMs: parseInt(env.RATE_LIMIT_WINDOW_MS, 10),
    max: parseInt(env.RATE_LIMIT_MAX, 10),
  };
}
