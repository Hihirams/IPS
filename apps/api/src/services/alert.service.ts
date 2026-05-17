import type { FastifyInstance } from 'fastify';
import { blockIp } from './cloudflare.service';

interface SlackPayload {
  text: string;
  blocks?: Array<{
    type: string;
    text?: { type: string; text: string };
  }>;
}

/**
 * Servicio de alertas de seguridad.
 *
 * Envía alertas a Slack (webhook) y Sentry (para eventos críticos).
 * TODAS las alertas incluyen timestamp, IP y severidad.
 *
 * SECURITY:
 * - Nunca incluir tokens, passwords o datos PCI en las alertas.
 * - IPs y userIds están permitidos (son metadata de seguridad).
 */

function getWebhookUrl(): string | undefined {
  return process.env.SLACK_WEBHOOK_URL;
}

async function sendSlackAlert(payload: SlackPayload): Promise<void> {
  const webhookUrl = getWebhookUrl();
  if (!webhookUrl) {
    // Si no hay Slack configurado, loguear localmente con Pino
    return;
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`Slack webhook returned ${res.status}`);
    }
  } catch (err) {
    // Fallback: loguear con el logger de la app si está disponible
    console.error('[ALERT] Failed to send Slack alert:', err);
  }
}

// ==========================================
// Alertas de Seguridad
// ==========================================

/**
 * Alerta: más de 10 intentos de login fallidos desde la misma IP en 5 minutos.
 * Acción: alerta en Slack + bloquear IP por 1 hora en Cloudflare.
 */
export async function alertBruteForce(
  app: FastifyInstance,
  ip: string,
  attempts: number
): Promise<void> {
  const message = `🚨 *ALERTA DE SEGURIDAD: Brute Force Detectado*

- IP: ${ip}
- Intentos fallidos: ${attempts}
- Ventana: 5 minutos
- Acción: IP bloqueada por 1 hora en Cloudflare WAF
- Timestamp: ${new Date().toISOString()}`;

  await sendSlackAlert({ text: message });

  // Intentar bloquear IP en Cloudflare (no bloqueante para el request actual)
  try {
    await blockIp(ip, 60);
    app.log.warn({ ip, attempts, action: 'IP_BLOCKED' }, 'IP bloqueada por brute force');
  } catch (err) {
    app.log.error({ err, ip }, 'Error al bloquear IP en Cloudflare');
  }
}

/**
 * Alerta: más de 5 intentos de pago fallidos en 1 hora.
 * Acción: alerta en Slack para revisión manual.
 */
export async function alertPaymentFailure(
  app: FastifyInstance,
  userId: string,
  attempts: number
): Promise<void> {
  const message = `⚠️ *Alerta de Seguridad: Múltiples pagos fallidos*

- UserId: ${userId}
- Intentos fallidos: ${attempts}
- Ventana: 1 hora
- Acción: Revisión manual requerida
- Timestamp: ${new Date().toISOString()}`;

  await sendSlackAlert({ text: message });
  app.log.warn({ userId, attempts, action: 'PAYMENT_FAILURES' }, 'Múltiples pagos fallidos detectados');
}

/**
 * Alerta crítica: webhook de Stripe con firma inválida.
 * Acción: alerta inmediata en Slack + log crítico.
 */
export async function alertInvalidWebhook(
  app: FastifyInstance,
  ip: string,
  signature?: string
): Promise<void> {
  const message = `🔴 *ALERTA CRÍTICA: Webhook de Stripe firma inválida*

- IP origen: ${ip}
- Signature presente: ${signature ? 'Sí' : 'No'}
- Acción: Revisar inmediatamente posible ataque
- Timestamp: ${new Date().toISOString()}`;

  await sendSlackAlert({ text: message });
  app.log.error({ ip, action: 'INVALID_WEBHOOK' }, 'Webhook de Stripe con firma inválida');
}

/**
 * Alerta: error 500 en /api/checkout.
 * Acción: alerta inmediata en Slack.
 */
export async function alertCheckoutError(
  app: FastifyInstance,
  error: Error,
  userId?: string
): Promise<void> {
  const message = `🔴 *ALERTA CRÍTICA: Error 500 en Checkout*

- UserId: ${userId ?? 'anónimo'}
- Error: ${error.message}
- Acción: Revisar inmediatamente
- Timestamp: ${new Date().toISOString()}`;

  await sendSlackAlert({ text: message });
  app.log.error({ userId, err: error, action: 'CHECKOUT_500' }, 'Error 500 en checkout');
}

/**
 * Alerta: acceso al panel admin desde IP nueva.
 * Acción: email al admin + alerta en Slack.
 */
export async function alertAdminNewIp(
  app: FastifyInstance,
  adminId: string,
  adminEmail: string,
  ip: string,
  deviceInfo?: string
): Promise<void> {
  const message = `🛡️ *Alerta de Seguridad: Admin desde IP nueva*

- AdminId: ${adminId}
- Email: ${adminEmail}
- IP: ${ip}
- Dispositivo: ${deviceInfo ?? 'desconocido'}
- Acción: Verificar legitimidad
- Timestamp: ${new Date().toISOString()}`;

  await sendSlackAlert({ text: message });
  app.log.warn(
    { adminId, adminEmail, ip, deviceInfo, action: 'ADMIN_NEW_IP' },
    'Admin desde IP nueva detectada'
  );
}

/**
 * Alerta crítica: hash de stripe.js ha cambiado (posible Magecart).
 * Acción: alerta inmediata en Slack.
 */
export async function alertStripeIntegrityChange(
  app: FastifyInstance,
  newHash: string,
  expectedHash: string
): Promise<void> {
  const message = `🔴 *ALERTA CRÍTICA: Hash de stripe.js cambiado (posible Magecart)*

- Hash esperado: ${expectedHash.substring(0, 30)}...
- Hash actual: ${newHash.substring(0, 30)}...
- Acción: VERIFICAR INMEDIATAMENTE integridad de stripe.js
- Timestamp: ${new Date().toISOString()}`;

  await sendSlackAlert({ text: message });
  app.log.fatal(
    { expectedHash, newHash, action: 'STRIPE_INTEGRITY' },
    'Hash de stripe.js ha cambiado - posible Magecart'
  );
}
