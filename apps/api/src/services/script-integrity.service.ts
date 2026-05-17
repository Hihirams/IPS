import crypto from 'crypto';
import type { FastifyInstance } from 'fastify';
import { alertStripeIntegrityChange } from './alert.service';

/**
 * Servicio de monitoreo de integridad de scripts externos.
 *
 * Descarga periódicamente stripe.js y verifica que su hash SHA-384
 * no ha cambiado. Si cambia: alerta crítica inmediata (posible Magecart).
 *
 * SECURITY:
 * - El hash esperado se configura en la variable de entorno STRIPE_JS_HASH.
 * - Si el hash cambia, significa que el script de Stripe fue modificado
 *   (inyección de código malicioso = ataque Magecart).
 */

const STRIPE_JS_URL = 'https://js.stripe.com/v3/';

/**
 * Calcula el hash SHA-384 de un buffer en base64.
 */
function computeSha384(data: Buffer): string {
  const hash = crypto.createHash('sha384').update(data).digest('base64');
  return `sha384-${hash}`;
}

/**
 * Descarga stripe.js y verifica su hash.
 * Si el hash ha cambiado, envía alerta crítica.
 *
 * @returns true si el hash coincide, false si no coincide o hay error.
 */
export async function verifyStripeJsIntegrity(app: FastifyInstance): Promise<boolean> {
  const expectedHash = process.env.STRIPE_JS_HASH;

  if (!expectedHash) {
    app.log.warn(
      { action: 'STRIPE_INTEGRITY' },
      'STRIPE_JS_HASH no está configurado. No se puede verificar integridad de stripe.js.'
    );
    return false;
  }

  try {
    const res = await fetch(STRIPE_JS_URL, {
      method: 'GET',
      // No seguir redirects (seguridad: verificar que es stripe.com)
      redirect: 'error',
    });

    if (!res.ok) {
      app.log.error(
        { status: res.status, action: 'STRIPE_INTEGRITY' },
        `Error al descargar stripe.js: ${res.status}`
      );
      return false;
    }

    const body = Buffer.from(await res.arrayBuffer());
    const actualHash = computeSha384(body);

    if (actualHash !== expectedHash) {
      app.log.fatal(
        { expectedHash, actualHash, action: 'STRIPE_INTEGRITY' },
        'Hash de stripe.js NO COINCIDE - posible Magecart'
      );

      // Alerta crítica inmediata
      await alertStripeIntegrityChange(app, actualHash, expectedHash);

      return false;
    }

    app.log.info(
      { action: 'STRIPE_INTEGRITY' },
      'Hash de stripe.js verificado correctamente'
    );

    return true;
  } catch (err) {
    app.log.error(
      { err, action: 'STRIPE_INTEGRITY' },
      'Error al verificar integridad de stripe.js'
    );
    return false;
  }
}

/**
 * Inicia un cronjob que verifica la integridad de stripe.js cada hora.
 * En producción esto debería ejecutarse como un job separado (no en el
 * hilo principal del servidor).
 */
export function startStripeIntegrityCron(app: FastifyInstance): NodeJS.Timeout {
  // Verificar inmediatamente al arrancar
  verifyStripeJsIntegrity(app).catch((err) => {
    app.log.error({ err }, 'Error inicial en verifyStripeJsIntegrity');
  });

  // Luego cada hora (3600000 ms)
  const interval = setInterval(() => {
    verifyStripeJsIntegrity(app).catch((err) => {
      app.log.error({ err }, 'Error en cron de verifyStripeJsIntegrity');
    });
  }, 60 * 60 * 1000);

  return interval;
}
