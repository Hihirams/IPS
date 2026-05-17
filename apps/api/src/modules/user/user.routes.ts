import type { FastifyInstance } from 'fastify';
import { authenticate, requireAdmin } from '../../middleware/auth.middleware';
import { requireMFA, requireAdminSession } from '../../middleware/admin-auth.middleware';
import { logAdminAction } from '../admin/audit.service';
import {
  UpdateProfileSchema,
  ChangePasswordSchema,
  CreateAddressSchema,
  UpdateAddressSchema,
  CreateReviewSchema,
} from './user.schema';
import type {
  UpdateProfileInput,
  ChangePasswordInput,
  CreateAddressInput,
  UpdateAddressInput,
  CreateReviewInput,
} from './user.schema';
import { getUserProfile, updateUserProfile, changeUserPassword } from './profile.service';
import { getUserAddresses, getAddressById, createAddress, updateAddress, deleteAddress } from './address.service';
import { getUserSessions, revokeUserSession, revokeAllOtherSessions } from './session.service';
import { createReview, getProductReviews, getAllReviews, approveReview, deleteReview } from '../review/review.service';
import { prisma } from '../../lib/prisma';

/**
 * Rate limit para rutas de usuario.
 */
const USER_RATE_LIMIT = {
  config: {
    rateLimit: { max: 60, timeWindow: '1 minute' },
  },
};

/**
 * Registra rutas de usuario (perfil, direcciones, sesiones, órdenes, reseñas).
 */
export async function userRoutes(app: FastifyInstance) {
  // ==========================================
  // Profile
  // ==========================================

  app.get(
    '/api/user/profile',
    { preHandler: [authenticate], ...USER_RATE_LIMIT },
    async (request, reply) => {
      const userId = request.user!.id;
      const profile = await getUserProfile(userId);

      if (!profile) {
        return reply.status(404).send({
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'Usuario no encontrado.' },
        });
      }

      return reply.status(200).send({ success: true, data: profile });
    }
  );

  app.patch(
    '/api/user/profile',
    { preHandler: [authenticate], ...USER_RATE_LIMIT },
    async (request, reply) => {
      const userId = request.user!.id;
      const data = request.validate(UpdateProfileSchema, 'body') as UpdateProfileInput;

      try {
        const updated = await updateUserProfile(userId, data);
        return reply.status(200).send({ success: true, data: updated });
      } catch (err) {
        if (err instanceof Error && err.message === 'INVALID_PHONE_FORMAT') {
          return reply.status(400).send({
            success: false,
            error: { code: 'INVALID_PHONE', message: 'Formato de teléfono inválido. Usa formato E.164 (+521234567890).' },
          });
        }
        throw err;
      }
    }
  );

  app.post(
    '/api/user/change-password',
    { preHandler: [authenticate], ...USER_RATE_LIMIT },
    async (request, reply) => {
      const userId = request.user!.id;
      const currentSessionId = request.user!.sessionId;
      const data = request.validate(ChangePasswordSchema, 'body') as ChangePasswordInput;

      if (!currentSessionId) {
        return reply.status(400).send({
          success: false,
          error: { code: 'SESSION_ID_MISSING', message: 'No se pudo identificar la sesión actual. Inicia sesión nuevamente.' },
        });
      }

      const result = await changeUserPassword(app, {
        userId,
        currentSessionId,
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });

      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'PASSWORD_CHANGE_FAILED', message: result.error },
        });
      }

      return reply.status(200).send({
        success: true,
        data: { message: 'Contraseña cambiada exitosamente.' },
      });
    }
  );

  // ==========================================
  // Orders (historial del usuario)
  // ==========================================

  app.get(
    '/api/user/orders',
    { preHandler: [authenticate], ...USER_RATE_LIMIT },
    async (request, reply) => {
      const userId = request.user!.id;
      const rawQuery = request.query as Record<string, string | undefined>;
      const page = Math.max(1, Number(rawQuery.page ?? 1));
      const pageSize = Math.min(100, Math.max(1, Number(rawQuery.pageSize ?? 10)));

      const [data, total] = await Promise.all([
        prisma.order.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
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
        }),
        prisma.order.count({ where: { userId } }),
      ]);

      return reply.status(200).send({
        success: true,
        data: data.map((order) => ({
          ...order,
          total: Number(order.total),
        })),
        meta: {
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
          hasNextPage: page < Math.ceil(total / pageSize),
          hasPrevPage: page > 1,
        },
      });
    }
  );

  app.get(
    '/api/user/orders/:id',
    { preHandler: [authenticate], ...USER_RATE_LIMIT },
    async (request, reply) => {
      const userId = request.user!.id;
      const { id } = request.params as { id: string };

      const order = await prisma.order.findFirst({
        where: { id, userId },
        include: {
          items: {
            select: {
              id: true,
              productName: true,
              productSku: true,
              quantity: true,
              unitPrice: true,
              total: true,
            },
          },
          address: true,
          statusHistory: {
            orderBy: { createdAt: 'desc' },
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
        },
      });
    }
  );

  // ==========================================
  // Addresses
  // ==========================================

  app.get(
    '/api/user/addresses',
    { preHandler: [authenticate], ...USER_RATE_LIMIT },
    async (request, reply) => {
      const userId = request.user!.id;
      const addresses = await getUserAddresses(userId);
      return reply.status(200).send({ success: true, data: addresses });
    }
  );

  app.post(
    '/api/user/addresses',
    { preHandler: [authenticate], ...USER_RATE_LIMIT },
    async (request, reply) => {
      const userId = request.user!.id;
      const data = request.validate(CreateAddressSchema, 'body') as CreateAddressInput;

      const result = await createAddress(userId, data);

      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'ADDRESS_LIMIT', message: result.error },
        });
      }

      return reply.status(201).send({ success: true, data: result.address });
    }
  );

  app.patch(
    '/api/user/addresses/:id',
    { preHandler: [authenticate], ...USER_RATE_LIMIT },
    async (request, reply) => {
      const userId = request.user!.id;
      const { id } = request.params as { id: string };
      const data = request.validate(UpdateAddressSchema, 'body') as UpdateAddressInput;

      const result = await updateAddress(id, userId, data);

      if (!result.success) {
        return reply.status(404).send({
          success: false,
          error: { code: 'ADDRESS_NOT_FOUND', message: result.error },
        });
      }

      return reply.status(200).send({ success: true, data: result.address });
    }
  );

  app.delete(
    '/api/user/addresses/:id',
    { preHandler: [authenticate], ...USER_RATE_LIMIT },
    async (request, reply) => {
      const userId = request.user!.id;
      const { id } = request.params as { id: string };

      const result = await deleteAddress(id, userId);

      if (!result.success) {
        return reply.status(404).send({
          success: false,
          error: { code: 'ADDRESS_NOT_FOUND', message: result.error },
        });
      }

      return reply.status(204).send();
    }
  );

  // ==========================================
  // Sessions
  // ==========================================

  app.get(
    '/api/user/sessions',
    { preHandler: [authenticate], ...USER_RATE_LIMIT },
    async (request, reply) => {
      const userId = request.user!.id;
      const sessions = await getUserSessions(userId);
      return reply.status(200).send({
        success: true,
        data: sessions.map((s) => ({
          ...s,
          isCurrent: s.id === request.user!.sessionId,
        })),
      });
    }
  );

  app.delete(
    '/api/user/sessions/:id',
    { preHandler: [authenticate], ...USER_RATE_LIMIT },
    async (request, reply) => {
      const userId = request.user!.id;
      const { id } = request.params as { id: string };

      const result = await revokeUserSession(app, id, userId);

      if (!result.success) {
        return reply.status(404).send({
          success: false,
          error: { code: 'SESSION_NOT_FOUND', message: result.error },
        });
      }

      return reply.status(204).send();
    }
  );

  app.delete(
    '/api/user/sessions',
    { preHandler: [authenticate], ...USER_RATE_LIMIT },
    async (request, reply) => {
      const userId = request.user!.id;
      const currentSessionId = request.user!.sessionId;

      if (!currentSessionId) {
        return reply.status(400).send({
          success: false,
          error: { code: 'SESSION_ID_MISSING', message: 'No se pudo identificar la sesión actual.' },
        });
      }

      const result = await revokeAllOtherSessions(app, userId, currentSessionId);

      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'SESSION_REVOKE_FAILED', message: result.error },
        });
      }

      return reply.status(200).send({
        success: true,
        data: { message: 'Todas las demás sesiones han sido cerradas.' },
      });
    }
  );

  // ==========================================
  // Reviews (user-facing)
  // ==========================================

  app.post(
    '/api/reviews',
    { preHandler: [authenticate], ...USER_RATE_LIMIT },
    async (request, reply) => {
      const userId = request.user!.id;
      const data = request.validate(CreateReviewSchema, 'body') as CreateReviewInput;

      const result = await createReview({
        userId,
        productId: data.productId,
        rating: data.rating,
        title: data.title,
        body: data.body,
      });

      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'REVIEW_ERROR', message: result.error },
        });
      }

      return reply.status(201).send({ success: true, data: result.review });
    }
  );

  app.get(
    '/api/products/:productId/reviews',
    async (request, reply) => {
      const { productId } = request.params as { productId: string };
      const rawReviewQuery = request.query as Record<string, string | undefined>;
      const page = Math.max(1, Number(rawReviewQuery.page ?? 1));
      const pageSize = Math.min(100, Math.max(1, Number(rawReviewQuery.pageSize ?? 10)));

      const result = await getProductReviews(productId, page, pageSize);

      return reply.status(200).send({
        success: true,
        data: result.data,
        meta: {
          total: result.total,
          page: result.page,
          pageSize: result.pageSize,
          totalPages: result.totalPages,
        },
      });
    }
  );

  // ==========================================
  // Admin Review Management
  // ==========================================

  app.get(
    '/api/admin/reviews',
    {
      preHandler: [authenticate, requireAdmin, requireMFA, requireAdminSession],
      ...USER_RATE_LIMIT,
    },
    async (request, reply) => {
      const rawAdminQuery = request.query as Record<string, string | undefined>;
      const isApproved = rawAdminQuery.isApproved;
      const productId = rawAdminQuery.productId;
      const userId = rawAdminQuery.userId;
      const page = Math.max(1, Number(rawAdminQuery.page ?? 1));
      const pageSize = Math.min(100, Math.max(1, Number(rawAdminQuery.pageSize ?? 20)));

      const result = await getAllReviews({
        isApproved: isApproved !== undefined ? isApproved === 'true' : undefined,
        productId,
        userId,
        page,
        pageSize,
      });

      return reply.status(200).send({
        success: true,
        data: result.data,
        meta: {
          total: result.total,
          page: result.page,
          pageSize: result.pageSize,
          totalPages: result.totalPages,
        },
      });
    }
  );

  app.patch(
    '/api/admin/reviews/:id/approve',
    {
      preHandler: [authenticate, requireAdmin, requireMFA, requireAdminSession],
      ...USER_RATE_LIMIT,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const adminId = request.user!.id;
      const ipAddress = request.ip ?? 'unknown';

      const success = await approveReview(id);

      if (!success) {
        return reply.status(404).send({
          success: false,
          error: { code: 'REVIEW_NOT_FOUND', message: 'Reseña no encontrada.' },
        });
      }

      await logAdminAction(
        adminId,
        'APPROVE_REVIEW',
        'review',
        id,
        { isApproved: false },
        { isApproved: true },
        ipAddress
      );

      return reply.status(200).send({
        success: true,
        data: { message: 'Reseña aprobada exitosamente.' },
      });
    }
  );

  app.delete(
    '/api/admin/reviews/:id',
    {
      preHandler: [authenticate, requireAdmin, requireMFA, requireAdminSession],
      ...USER_RATE_LIMIT,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const adminId = request.user!.id;
      const ipAddress = request.ip ?? 'unknown';

      const success = await deleteReview(id);

      if (!success) {
        return reply.status(404).send({
          success: false,
          error: { code: 'REVIEW_NOT_FOUND', message: 'Reseña no encontrada.' },
        });
      }

      await logAdminAction(
        adminId,
        'DELETE_REVIEW',
        'review',
        id,
        null,
        null,
        ipAddress
      );

      return reply.status(204).send();
    }
  );
}
