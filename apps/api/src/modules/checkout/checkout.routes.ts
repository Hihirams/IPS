import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import Stripe from 'stripe';
import { authenticate } from '../../middleware/auth.middleware';
import { CreatePaymentIntentSchema } from './checkout.schema';
import type { CreatePaymentIntentInput } from './checkout.schema';
import { validateCart, createOrder, reserveStock, releaseStock, validateCartWithSyscom } from './checkout.service';
import {
  createStripePaymentIntent,
  verifyWebhookSignature,
  retrievePaymentIntent,
  cancelPaymentIntent,
  stripe,
} from './stripe.service';
import { prisma } from '../../lib/prisma';
import crypto from 'crypto';
import { alertInvalidWebhook, alertCheckoutError } from '../../services/alert.service';

/**
 * Registra rutas de checkout y webhook de Stripe.
 *
 * NOTA CRÍTICA: El webhook de Stripe NO debe tener autenticación ni CSRF,
 * ya que Stripe lo llama directamente. La seguridad se basa en la verificación
 * de firma del webhook.
 */
export async function checkoutRoutes(app: FastifyInstance) {
  // ==========================================
  // POST /api/checkout/validate
  // ==========================================
  app.post('/api/checkout/validate', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = request.user!.id;

    try {
      const { summary, cartId } = await validateCart(userId);

      // Verificar productos SYSCOM contra la API del proveedor
      const cartItems = await prisma.cart.findUnique({
        where: { userId },
        select: {
          items: {
            select: {
              productId: true,
              quantity: true,
              product: { select: { id: true, syscomId: true } },
            },
          },
        },
      });

      let finalSummary = summary;
      if (cartItems && cartItems.items.length > 0) {
        finalSummary = await validateCartWithSyscom(
          app,
          cartItems.items.map((i) => ({
            productId: i.product.id,
            syscomId: i.product.syscomId,
            quantity: i.quantity,
          })),
          summary
        );
      }

      return reply.status(200).send({
        success: true,
        data: finalSummary,
      });
    } catch (error) {
      if ((error as Error).message === 'CART_EMPTY') {
        return reply.status(400).send({
          success: false,
          error: { code: 'CART_EMPTY', message: 'El carrito está vacío.' },
        });
      }
      throw error;
    }
  });

  // ==========================================
  // POST /api/checkout/create-payment-intent
  // ==========================================
  app.post(
    '/api/checkout/create-payment-intent',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const userId = request.user!.id;
      const data = request.validate(CreatePaymentIntentSchema, 'body') as CreatePaymentIntentInput;

      // Rate limit: máx 5 intentos por usuario por hora
      const attemptKey = `payment_attempts:${userId}`;
      const attempts = parseInt((await app.redis.get(attemptKey)) ?? '0', 10);

      if (attempts >= 5) {
        return reply.status(429).send({
          success: false,
          error: {
            code: 'TOO_MANY_PAYMENT_ATTEMPTS',
            message: 'Demasiados intentos de pago. Por favor espera 1 hora.',
          },
        });
      }

      // Validar carrito
      let summary: Awaited<ReturnType<typeof validateCart>>['summary'];
      let cartId: string;

      try {
        const result = await validateCart(userId);
        summary = result.summary;
        cartId = result.cartId;
      } catch (error) {
        if ((error as Error).message === 'CART_EMPTY') {
          return reply.status(400).send({
            success: false,
            error: { code: 'CART_EMPTY', message: 'El carrito está vacío.' },
          });
        }
        throw error;
      }

      // Verificar dirección
      const address = await prisma.address.findFirst({
        where: { id: data.addressId, userId },
      });

      if (!address) {
        return reply.status(400).send({
          success: false,
          error: { code: 'INVALID_ADDRESS', message: 'Dirección no válida.' },
        });
      }

      // Verificar que no hay alertas de stock
      if (summary.stockAlerts.length > 0) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'STOCK_ALERT',
            message: 'Algunos productos no tienen stock suficiente.',
            details: summary.stockAlerts,
          },
        });
      }

      // Crear PaymentIntent en Stripe
      const amountInCents = Math.round(summary.total * 100);
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { createdAt: true },
      });

      const { clientSecret, paymentIntentId } = await createStripePaymentIntent(
        amountInCents,
        'mxn',
        {
          orderId: '', // Se actualizará después de crear la orden
          userId,
          cartId,
          ip_address: request.ip ?? 'unknown',
          user_agent: request.headers['user-agent'] ?? 'unknown',
          account_created_at: user?.createdAt.toISOString() ?? '',
        }
      );

      // Crear orden y reservar stock en transacción
      let order: { id: string; orderNumber: string };

      try {
        order = await prisma.$transaction(async (tx) => {
          // Reservar stock
          await reserveStock(
            tx,
            summary.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
            }))
          );

          // Crear orden
          const newOrder = await tx.order.create({
            data: {
              orderNumber: generateOrderNumber(),
              userId,
              addressId: data.addressId,
              status: 'PENDING',
              subtotal: summary.subtotal,
              shipping: summary.shipping,
              tax: summary.tax,
              total: summary.total,
              stripePaymentIntentId: paymentIntentId,
              notes: data.notes ?? null,
              items: {
                create: summary.items.map((item) => ({
                  productId: item.productId,
                  productName: item.name,
                  productSku: item.sku,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  total: Math.round(item.unitPrice * item.quantity * 100) / 100,
                })),
              },
              statusHistory: {
                create: {
                  status: 'PENDING',
                  notes: 'Orden creada, esperando confirmación de pago.',
                },
              },
            },
          });

          return newOrder;
        });

        // Actualizar metadata del PaymentIntent con orderId
        await stripe.paymentIntents.update(paymentIntentId, {
          metadata: {
            orderId: order.id,
            userId,
            cartId,
          },
        });

        // Guardar reserva en Redis con TTL de 15 minutos
        await app.redis.setex(
          `stock_reserve:${order.id}`,
          15 * 60,
          JSON.stringify(summary.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })))
        );

        // Incrementar contador de intentos
        await app.redis.incr(attemptKey);
        await app.redis.expire(attemptKey, 60 * 60); // 1 hora

        return reply.status(200).send({
          success: true,
          data: {
            clientSecret,
            orderId: order.id,
            orderNumber: order.orderNumber,
            total: summary.total,
          },
        });
      } catch (error) {
        // Si falla la creación de la orden, cancelar el PaymentIntent
        try {
          await cancelPaymentIntent(paymentIntentId);
        } catch {
          // Ignorar error de cancelación
        }

        // SECURITY: Alerta inmediata de error en checkout
        alertCheckoutError(app, error as Error, userId).catch((err) => {
          app.log.error({ err }, 'Error al enviar alerta de checkout error');
        });

        throw error;
      }
    }
  );

  // ==========================================
  // POST /api/webhooks/stripe
  // CRÍTICO: Sin auth, sin CSRF. Verifica firma de Stripe.
  // ==========================================
  app.post('/api/webhooks/stripe', async (request, reply) => {
    const signature = request.headers['stripe-signature'] as string;

    if (!signature) {
      app.log.warn('Webhook de Stripe sin signature');
      // SECURITY: Alerta de webhook inválido (posible ataque)
      alertInvalidWebhook(app, request.ip ?? 'unknown').catch((err) => {
        app.log.error({ err }, 'Error al enviar alerta de webhook inválido');
      });
      return reply.status(400).send({ error: 'Missing signature' });
    }

    let event: Stripe.Event;

    try {
      // El body ya debe ser string/raw gracias al content type parser
      const payload = request.body as string | Buffer;
      event = verifyWebhookSignature(payload, signature);
    } catch (err) {
      app.log.warn({ action: 'STRIPE_WEBHOOK_INVALID', error: (err as Error).message });
      // SECURITY: Alerta de webhook inválido (posible ataque)
      alertInvalidWebhook(app, request.ip ?? 'unknown', signature).catch((alertErr) => {
        app.log.error({ err: alertErr }, 'Error al enviar alerta de webhook inválido');
      });
      return reply.status(400).send({ error: 'Invalid signature' });
    }

    // Idempotencia: verificar si ya procesamos este evento
    const existingEvent = await prisma.orderStatusHistory.findFirst({
      where: { notes: { contains: event.id } },
    });

    if (existingEvent) {
      app.log.info({ action: 'STRIPE_WEBHOOK_DUPLICATE', eventId: event.id });
      return reply.status(200).send({ received: true });
    }

    app.log.info({ action: 'STRIPE_WEBHOOK_RECEIVED', type: event.type, eventId: event.id });

    try {
      switch (event.type) {
        case 'payment_intent.succeeded': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          await handlePaymentSucceeded(app, paymentIntent, event.id);
          break;
        }

        case 'payment_intent.payment_failed': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          await handlePaymentFailed(app, paymentIntent, event.id);
          break;
        }

        case 'charge.refunded': {
          const charge = event.data.object as Stripe.Charge;
          await handleChargeRefunded(app, charge, event.id);
          break;
        }

        default:
          app.log.info({ action: 'STRIPE_WEBHOOK_UNHANDLED', type: event.type });
      }
    } catch (err) {
      app.log.error({ action: 'STRIPE_WEBHOOK_ERROR', error: (err as Error).message, eventId: event.id });
      // No retornar 500 — Stripe reintentará. Retornar 200 para evitar reintentos innecesarios.
      // En producción, usar una cola de jobs (BullMQ, etc.) para reintentar manualmente.
    }

    return reply.status(200).send({ received: true });
  });
}

// ==========================================
// Handlers de eventos Stripe
// ==========================================

async function handlePaymentSucceeded(
  app: FastifyInstance,
  paymentIntent: Stripe.PaymentIntent,
  eventId: string
) {
  const order = await prisma.order.findFirst({
    where: { stripePaymentIntentId: paymentIntent.id },
    include: { items: true },
  });

  if (!order) {
    app.log.error({ action: 'ORDER_NOT_FOUND', paymentIntentId: paymentIntent.id });
    return;
  }

  if (order.status === 'CONFIRMED') {
    app.log.info({ action: 'ORDER_ALREADY_CONFIRMED', orderId: order.id });
    return;
  }

  await prisma.$transaction(async (tx) => {
    // Confirmar orden
    await tx.order.update({
      where: { id: order.id },
      data: {
        status: 'CONFIRMED',
        stripeChargeId: paymentIntent.latest_charge as string,
        paidAt: new Date(),
      },
    });

    // Historial de estado
    await tx.orderStatusHistory.create({
      data: {
        orderId: order.id,
        status: 'CONFIRMED',
        notes: `Pago confirmado. Evento Stripe: ${eventId}`,
      },
    });

    // Vaciar carrito del usuario
    const cart = await tx.cart.findUnique({ where: { userId: order.userId } });
    if (cart) {
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
    }
  });

  // Eliminar reserva de Redis
  await app.redis.del(`stock_reserve:${order.id}`);

  // TODO: Enviar email de confirmación (async, no bloquear)
  app.log.info({ action: 'ORDER_CONFIRMED', orderId: order.id, orderNumber: order.orderNumber });
}

async function handlePaymentFailed(
  app: FastifyInstance,
  paymentIntent: Stripe.PaymentIntent,
  eventId: string
) {
  const order = await prisma.order.findFirst({
    where: { stripePaymentIntentId: paymentIntent.id },
    include: { items: true },
  });

  if (!order) {
    app.log.error({ action: 'ORDER_NOT_FOUND', paymentIntentId: paymentIntent.id });
    return;
  }

  if (order.status === 'CANCELLED') {
    return;
  }

  // Liberar stock
  const reserveData = await app.redis.get(`stock_reserve:${order.id}`);
  if (reserveData) {
    const items = JSON.parse(reserveData) as Array<{ productId: string; quantity: number }>;

    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }

      await tx.order.update({
        where: { id: order.id },
        data: { status: 'CANCELLED' },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: 'CANCELLED',
          notes: `Pago fallido: ${paymentIntent.last_payment_error?.message ?? 'Desconocido'}. Evento: ${eventId}`,
        },
      });
    });

    await app.redis.del(`stock_reserve:${order.id}`);
  }

  // Contar intentos fallidos (webhook payment_failed) y cancelar PI tras 3 fallos
  if (paymentIntent.last_payment_error) {
    const failCount = await app.redis.incr(`payment_failed:${order.id}`);
    if (failCount >= 3) {
      try {
        await cancelPaymentIntent(paymentIntent.id);
        await app.redis.setex(`payment_failed:${order.id}`, 24 * 60 * 60, 'cancelled');
      } catch {
        // Ignorar
      }
    }
  }

  app.log.info({ action: 'ORDER_CANCELLED', orderId: order.id, reason: 'payment_failed' });
}

async function handleChargeRefunded(
  app: FastifyInstance,
  charge: Stripe.Charge,
  eventId: string
) {
  const order = await prisma.order.findFirst({
    where: { stripeChargeId: charge.id },
    include: { items: true },
  });

  if (!order) {
    app.log.error({ action: 'ORDER_NOT_FOUND', chargeId: charge.id });
    return;
  }

  if (order.status === 'REFUNDED') {
    return;
  }

  // Restaurar stock
  await prisma.$transaction(async (tx) => {
    for (const item of order.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });
    }

    await tx.order.update({
      where: { id: order.id },
      data: { status: 'REFUNDED' },
    });

    await tx.orderStatusHistory.create({
      data: {
        orderId: order.id,
        status: 'REFUNDED',
        notes: `Reembolso procesado. Evento Stripe: ${eventId}`,
      },
    });
  });

  app.log.info({ action: 'ORDER_REFUNDED', orderId: order.id });
}

function generateOrderNumber(): string {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ECO-${datePart}-${randomPart}`;
}
