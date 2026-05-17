import { prisma } from '../../lib/prisma';
import type { FastifyInstance } from 'fastify';
import { logAdminAction } from './audit.service';
import { sendOrderStatusChange } from '../../services/email.service';
import Stripe from 'stripe';

/**
 * Servicio de gestión de órdenes para administradores.
 * Incluye transiciones de estado, reembolsos automáticos y auditoría.
 */

// Transiciones de estado válidas
const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['CONFIRMED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
};

/**
 * Valida si una transición de estado es permitida.
 */
export function isValidStatusTransition(currentStatus: string, newStatus: string): boolean {
  return VALID_TRANSITIONS[currentStatus]?.includes(newStatus) ?? false;
}

/**
 * Obtiene lista paginada de órdenes con filtros.
 */
export async function getAdminOrders({
  status,
  from,
  to,
  userId,
  search,
  page,
  pageSize,
}: {
  status?: string;
  from?: Date;
  to?: Date;
  userId?: string;
  search?: string;
  page: number;
  pageSize: number;
}) {
  const where: Record<string, unknown> = {};

  if (status) where.status = status;
  if (userId) where.userId = userId;
  if (from || to) {
    where.createdAt = {};
    if (from) (where.createdAt as Record<string, Date>).gte = from;
    if (to) (where.createdAt as Record<string, Date>).lte = to;
  }
  if (search) {
    where.OR = [
      { orderNumber: { contains: search, mode: 'insensitive' } },
      { user: { email: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        address: {
          select: {
            street: true,
            city: true,
            state: true,
          },
        },
        items: {
          select: {
            productName: true,
            quantity: true,
            unitPrice: true,
          },
          take: 3,
        },
      },
    }),
    prisma.order.count({ where }),
  ]);

  return {
    data: data.map((order) => ({
      ...order,
      subtotal: Number(order.subtotal),
      shipping: Number(order.shipping),
      tax: Number(order.tax),
      total: Number(order.total),
      items: order.items.map((item) => ({
        ...item,
        unitPrice: Number(item.unitPrice),
      })),
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Obtiene detalle completo de una orden.
 */
export async function getAdminOrderDetail(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
        },
      },
      address: true,
      items: {
        orderBy: { id: 'desc' },
      },
      statusHistory: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!order) return null;

  return {
    ...order,
    subtotal: Number(order.subtotal),
    shipping: Number(order.shipping),
    tax: Number(order.tax),
    total: Number(order.total),
    items: order.items.map((item) => ({
      ...item,
      unitPrice: Number(item.unitPrice),
      total: Number(item.total),
    })),
  };
}

/**
 * Actualiza el estado de una orden con validación de transiciones,
 * reembolso automático si aplica, y notificación por email.
 */
export async function updateOrderStatus(
  app: FastifyInstance,
  {
    orderId,
    newStatus,
    notes,
    adminId,
    ipAddress,
  }: {
    orderId: string;
    newStatus: string;
    notes?: string;
    adminId: string;
    ipAddress?: string;
  }
): Promise<{ success: true; refunded?: boolean; refundAmount?: number } | { success: false; error: string }> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: {
        select: {
          email: true,
          name: true,
        },
      },
      items: {
        select: {
          productId: true,
          quantity: true,
        },
      },
    },
  });

  if (!order) {
    return { success: false, error: 'Orden no encontrada.' };
  }

  // Validar transición
  if (!isValidStatusTransition(order.status, newStatus)) {
    return {
      success: false,
      error: `Transición de estado inválida: ${order.status} → ${newStatus}.`,
    };
  }

  let refunded = false;
  let refundAmount = 0;

  // Si es CANCELLED o REFUNDED y hay pago, crear reembolso en Stripe
  if ((newStatus === 'CANCELLED' || newStatus === 'REFUNDED') && order.paidAt && order.stripePaymentIntentId) {
    try {
      const stripe = new Stripe(app.config.STRIPE_SECRET_KEY, {
        apiVersion: '2023-10-16',
      });

      const refund = await stripe.refunds.create({
        payment_intent: order.stripePaymentIntentId,
        reason: 'requested_by_customer',
      });

      refunded = true;
      refundAmount = Number(refund.amount) / 100; // Stripe devuelve en centavos

      app.log.info(
        { orderId, refundId: refund.id, amount: refundAmount },
        'Reembolso de Stripe creado exitosamente'
      );
    } catch (err) {
      app.log.error({ err, orderId }, 'Error al crear reembolso en Stripe');
      return {
        success: false,
        error: 'No se pudo procesar el reembolso. Por favor contacta a soporte de Stripe.',
      };
    }
  }

  // Ejecutar en transacción
  const updatedOrder = await prisma.$transaction(async (tx) => {
    // Actualizar orden
    const updated = await tx.order.update({
      where: { id: orderId },
      data: {
        status: newStatus as import('@prisma/client').OrderStatus,
        notes: notes ?? undefined,
      },
    });

    // Crear entrada en historial
    await tx.orderStatusHistory.create({
      data: {
        orderId,
        status: newStatus as import('@prisma/client').OrderStatus,
        notes: notes ?? `Estado cambiado de ${order.status} a ${newStatus}`,
      },
    });

    // Si es CANCELLED y no había reembolso (no pagada), liberar stock
    if (newStatus === 'CANCELLED' && !order.paidAt) {
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
    }

    return updated;
  });

  // Registrar en audit log
  await logAdminAction(
    adminId,
    newStatus === 'CANCELLED' ? 'CANCEL_ORDER' : newStatus === 'REFUNDED' ? 'REFUND_ORDER' : 'UPDATE_ORDER_STATUS',
    'order',
    orderId,
    { status: order.status, notes: order.notes },
    { status: newStatus, notes, refunded, refundAmount },
    ipAddress
  );

  // Notificar al usuario
  await sendOrderStatusChange(app, {
    userEmail: order.user.email,
    userName: order.user.name,
    orderNumber: order.orderNumber,
    oldStatus: order.status,
    newStatus,
    notes,
  });

  return { success: true, refunded, refundAmount };
}
