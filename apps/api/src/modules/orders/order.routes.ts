import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../middleware/auth.middleware';
import { prisma } from '../../lib/prisma';

/**
 * Rutas de órdenes para el frontend.
 */
export async function orderRoutes(app: FastifyInstance) {
  // ==========================================
  // GET /api/orders/:orderId
  // ==========================================
  app.get('/api/orders/:orderId', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = request.user!.id;
    const { orderId } = request.params as { orderId: string };

    const order = await prisma.order.findFirst({
      where: { id: orderId, userId },
      include: {
        items: {
          select: {
            id: true,
            productName: true,
            quantity: true,
            unitPrice: true,
            total: true,
          },
        },
        address: true,
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!order) {
      return reply.status(404).send({
        success: false,
        error: { code: 'ORDER_NOT_FOUND', message: 'Pedido no encontrado.' },
      });
    }

    return reply.status(200).send({
      success: true,
      data: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        subtotal: Number(order.subtotal),
        shipping: Number(order.shipping),
        tax: Number(order.tax),
        total: Number(order.total),
        paidAt: order.paidAt,
        items: order.items.map((item) => ({
          ...item,
          unitPrice: Number(item.unitPrice),
          total: Number(item.total),
        })),
        address: order.address,
        statusHistory: order.statusHistory,
      },
    });
  });

  // ==========================================
  // GET /api/orders
  // ==========================================
  app.get('/api/orders', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = request.user!.id;

    const orders = await prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        total: true,
        createdAt: true,
        items: {
          select: {
            productName: true,
            quantity: true,
          },
          take: 1,
        },
      },
    });

    return reply.status(200).send({
      success: true,
      data: orders.map((order) => ({
        ...order,
        total: Number(order.total),
      })),
    });
  });
}
