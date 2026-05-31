import { Resend } from 'resend';
import type { FastifyInstance } from 'fastify';

/**
 * Servicio de email usando Resend.
 *
 * En desarrollo, si RESEND_API_KEY no está configurado,
 * los emails se loggean con Pino (nunca console.log).
 *
 * Templates HTML simples y responsivos, sin imágenes externas.
 */

let resend: Resend | null = null;

function getResendClient(env: { RESEND_API_KEY?: string }): Resend | null {
  if (env.RESEND_API_KEY) {
    if (!resend) {
      resend = new Resend(env.RESEND_API_KEY);
    }
    return resend;
  }
  return null;
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Envía un email genérico. Si Resend no está configurado, solo loggea.
 * SECURITY: No incluir datos sensibles (passwords, tokens) en el email.
 */
export async function sendEmail(
  app: FastifyInstance,
  { to, subject, html, text }: SendEmailParams
): Promise<void> {
  const fromEmail = app.config.EMAIL_FROM ?? 'noreply@ecommercetech.com';
  const client = getResendClient(app.config);

  if (!client) {
    app.log.info(
      { to, subject, from: fromEmail },
      '[EMAIL_STUB] Email no enviado (Resend no configurado)'
    );
    return;
  }

  try {
    const { error } = await client.emails.send({
      from: fromEmail,
      to,
      subject,
      html,
      text,
    });

    if (error) {
      app.log.error({ error, to, subject }, 'Error al enviar email con Resend');
      throw new Error(error.message);
    }

    app.log.info({ to, subject }, 'Email enviado exitosamente');
  } catch (err) {
    app.log.error({ err, to, subject }, 'Error al enviar email');
    throw err;
  }
}

// ==========================================
// Templates HTML base
// ==========================================

function baseTemplate(title: string, content: string): { html: string; text: string } {
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .header { background: #0f172a; padding: 24px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 20px; }
    .content { padding: 32px; color: #334155; font-size: 15px; line-height: 1.6; }
    .footer { padding: 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
    .button { display: inline-block; background: #0f172a; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; }
    .alert { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 16px 0; }
    .success { background: #dcfce7; border-left: 4px solid #22c55e; padding: 12px 16px; margin: 16px 0; }
    .info { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px 16px; margin: 16px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Ecommerce Tech</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      © 2026 Ecommerce Tech. Todos los derechos reservados.<br>
      Si necesitas ayuda, contacta a soporte.
    </div>
  </div>
</body>
</html>`;

  // Text version (strip HTML tags)
  const text = content.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

  return { html, text };
}

// ==========================================
// Templates específicos
// ==========================================

/**
 * Bienvenida para nuevos registros.
 */
export async function sendWelcomeEmail(
  app: FastifyInstance,
  { userEmail, userName }: { userEmail: string; userName: string | null }
): Promise<void> {
  const title = 'Bienvenido a Ecommerce Tech';
  const content = `
    <h2>Hola ${userName ?? 'Cliente'},</h2>
    <p>¡Gracias por registrarte en <strong>Ecommerce Tech</strong>!</p>
    <p>Tu cuenta ha sido creada exitosamente. Ahora puedes:</p>
    <ul>
      <li>Explorar nuestro catálogo de productos tecnológicos</li>
      <li>Agregar productos a tu carrito</li>
      <li>Realizar compras seguras</li>
    </ul>
    <p style="margin-top: 24px;">
      <a href="http://localhost:3000/productos" class="button">Ver productos</a>
    </p>
  `;

  const { html, text } = baseTemplate(title, content);
  await sendEmail(app, { to: userEmail, subject: title, html, text });
}

/**
 * Email con enlace para restablecer la contraseña.
 * SECURITY: el enlace lleva un token de un solo uso con expiración corta (30 min).
 * No se incluye ninguna contraseña; el token solo permite FIJAR una nueva.
 */
export async function sendPasswordResetEmail(
  app: FastifyInstance,
  {
    userEmail,
    userName,
    resetUrl,
  }: {
    userEmail: string;
    userName: string | null;
    resetUrl: string;
  }
): Promise<void> {
  const title = 'Restablece tu contraseña';
  const content = `
    <h2>Hola ${userName ?? 'Cliente'},</h2>
    <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
    <p>Haz clic en el botón para crear una nueva contraseña. Este enlace
       <strong>caduca en 30 minutos</strong> y solo puede usarse una vez.</p>
    <p style="margin-top: 24px;">
      <a href="${resetUrl}" class="button">Restablecer contraseña</a>
    </p>
    <div class="alert">
      Si tú no solicitaste este cambio, ignora este correo: tu contraseña no se modificará.
    </div>
  `;

  const { html, text } = baseTemplate(title, content);
  await sendEmail(app, { to: userEmail, subject: title, html, text });
}

/**
 * Confirmación de pedido.
 */
export async function sendOrderConfirmation(
  app: FastifyInstance,
  {
    userEmail,
    userName,
    orderNumber,
    items,
    total,
  }: {
    userEmail: string;
    userName: string | null;
    orderNumber: string;
    items: Array<{ productName: string; quantity: number; unitPrice: number }>;
    total: number;
  }
): Promise<void> {
  const title = `Confirmación de pedido #${orderNumber}`;
  const itemsHtml = items
    .map(
      (item) =>
        `<li>${item.productName} — ${item.quantity} x $${item.unitPrice.toFixed(2)}</li>`
    )
    .join('');

  const content = `
    <h2>Hola ${userName ?? 'Cliente'},</h2>
    <p>Tu pedido <strong>#${orderNumber}</strong> ha sido confirmado.</p>
    <div class="success">
      <strong>Resumen del pedido:</strong>
      <ul>${itemsHtml}</ul>
      <p style="margin-top: 12px;"><strong>Total: $${total.toFixed(2)} MXN</strong></p>
    </div>
    <p>Te notificaremos cuando el pedido sea enviado.</p>
  `;

  const { html, text } = baseTemplate(title, content);
  await sendEmail(app, { to: userEmail, subject: title, html, text });
}

/**
 * Cambio de estado de orden (reemplaza el stub anterior).
 */
export async function sendOrderStatusChange(
  app: FastifyInstance,
  {
    userEmail,
    userName,
    orderNumber,
    oldStatus,
    newStatus,
    notes,
  }: {
    userEmail: string;
    userName: string | null;
    orderNumber: string;
    oldStatus: string;
    newStatus: string;
    notes?: string | null;
  }
): Promise<void> {
  const title = `Actualización de pedido #${orderNumber}`;
  const content = `
    <h2>Hola ${userName ?? 'Cliente'},</h2>
    <p>El estado de tu pedido <strong>#${orderNumber}</strong> ha cambiado:</p>
    <div class="info">
      <p><strong>De:</strong> ${oldStatus}</p>
      <p><strong>A:</strong> ${newStatus}</p>
      ${notes ? `<p><strong>Notas:</strong> ${notes}</p>` : ''}
    </div>
    <p>Puedes ver el detalle de tu pedido en tu cuenta.</p>
  `;

  const { html, text } = baseTemplate(title, content);
  await sendEmail(app, { to: userEmail, subject: title, html, text });
}

/**
 * Pedido enviado.
 */
export async function sendOrderShipped(
  app: FastifyInstance,
  {
    userEmail,
    userName,
    orderNumber,
    trackingNumber,
  }: {
    userEmail: string;
    userName: string | null;
    orderNumber: string;
    trackingNumber?: string;
  }
): Promise<void> {
  const title = `Tu pedido #${orderNumber} ha sido enviado`;
  const trackingHtml = trackingNumber
    ? `<p><strong>Número de guía:</strong> ${trackingNumber}</p>`
    : '';

  const content = `
    <h2>Hola ${userName ?? 'Cliente'},</h2>
    <p>¡Buenas noticias! Tu pedido <strong>#${orderNumber}</strong> ha sido enviado.</p>
    <div class="success">
      <p>Está en camino a tu dirección de envío.</p>
      ${trackingHtml}
    </div>
    <p>Gracias por tu compra.</p>
  `;

  const { html, text } = baseTemplate(title, content);
  await sendEmail(app, { to: userEmail, subject: title, html, text });
}

/**
 * Reembolso procesado.
 */
export async function sendRefundNotification(
  app: FastifyInstance,
  {
    userEmail,
    userName,
    orderNumber,
    refundAmount,
  }: {
    userEmail: string;
    userName: string | null;
    orderNumber: string;
    refundAmount: number;
  }
): Promise<void> {
  const title = `Reembolso procesado — Pedido #${orderNumber}`;
  const content = `
    <h2>Hola ${userName ?? 'Cliente'},</h2>
    <p>El reembolso de tu pedido <strong>#${orderNumber}</strong> ha sido procesado.</p>
    <div class="success">
      <p><strong>Monto reembolsado:</strong> $${refundAmount.toFixed(2)} MXN</p>
      <p>El reembolso se reflejará en tu método de pago en 5-10 días hábiles.</p>
    </div>
    <p>Si tienes dudas, contacta a nuestro soporte.</p>
  `;

  const { html, text } = baseTemplate(title, content);
  await sendEmail(app, { to: userEmail, subject: title, html, text });
}

/**
 * Alerta de sesión desde nuevo dispositivo/IP.
 */
export async function sendNewDeviceAlert(
  app: FastifyInstance,
  {
    userEmail,
    userName,
    deviceInfo,
    ipAddress,
    loginTime,
  }: {
    userEmail: string;
    userName: string | null;
    deviceInfo: string;
    ipAddress: string;
    loginTime: Date;
  }
): Promise<void> {
  const title = 'Alerta de seguridad — Nuevo inicio de sesión';
  const content = `
    <h2>Hola ${userName ?? 'Cliente'},</h2>
    <p>Detectamos un inicio de sesión en tu cuenta desde un nuevo dispositivo o ubicación:</p>
    <div class="alert">
      <p><strong>Dispositivo:</strong> ${deviceInfo}</p>
      <p><strong>IP:</strong> ${ipAddress}</p>
      <p><strong>Fecha:</strong> ${loginTime.toLocaleString('es-MX')}</p>
    </div>
    <p>Si fuiste tú, puedes ignorar este mensaje. Si no reconoces este inicio de sesión, te recomendamos:</p>
    <ol>
      <li>Cambiar tu contraseña inmediatamente</li>
      <li>Revisar tus sesiones activas</li>
      <li>Contactar a soporte si necesitas ayuda</li>
    </ol>
    <p style="margin-top: 24px;">
      <a href="http://localhost:3000/perfil/seguridad" class="button">Revisar seguridad</a>
    </p>
  `;

  const { html, text } = baseTemplate(title, content);
  await sendEmail(app, { to: userEmail, subject: title, html, text });
}

/**
 * Notificación de cambio de contraseña.
 */
export async function sendPasswordChangedNotification(
  app: FastifyInstance,
  {
    userEmail,
    userName,
  }: {
    userEmail: string;
    userName: string | null;
  }
): Promise<void> {
  const title = 'Tu contraseña ha sido cambiada';
  const content = `
    <h2>Hola ${userName ?? 'Cliente'},</h2>
    <p>Tu contraseña ha sido cambiada exitosamente.</p>
    <div class="success">
      <p>Todas tus sesiones en otros dispositivos han sido cerradas por seguridad.</p>
    </div>
    <p>Si no fuiste tú quien cambió la contraseña, contacta a soporte inmediatamente.</p>
  `;

  const { html, text } = baseTemplate(title, content);
  await sendEmail(app, { to: userEmail, subject: title, html, text });
}

/**
 * Notificación de cuenta suspendida (reemplaza el stub anterior).
 */
export async function sendAccountBannedNotification(
  app: FastifyInstance,
  {
    userEmail,
    userName,
    reason,
  }: {
    userEmail: string;
    userName: string | null;
    reason: string;
  }
): Promise<void> {
  const title = 'Tu cuenta ha sido suspendida';
  const content = `
    <h2>Hola ${userName ?? 'Cliente'},</h2>
    <p>Tu cuenta ha sido suspendida por el siguiente motivo:</p>
    <div class="alert">
      <p>${reason}</p>
    </div>
    <p>Si crees que esto es un error, contacta a nuestro soporte.</p>
  `;

  const { html, text } = baseTemplate(title, content);
  await sendEmail(app, { to: userEmail, subject: title, html, text });
}
