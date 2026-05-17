import type { FastifyInstance } from 'fastify';
import { authenticate, requireAdmin } from '../../middleware/auth.middleware';
import { requireMFA, requireAdminSession } from '../../middleware/admin-auth.middleware';
import { getDashboardMetrics, invalidateDashboardCache } from './dashboard.service';
import { getAdminOrders, getAdminOrderDetail, updateOrderStatus } from './orders.service';
import { getAdminUsers, getAdminUserDetail, banUser } from './users.service';
import { getAuditLog } from './audit.service';
import {
  AdminOrderQuerySchema,
  UpdateOrderStatusSchema,
  AdminUserQuerySchema,
  BanUserSchema,
  AuditLogQuerySchema,
} from './admin.schema';
import { uploadImage, initCloudinary } from '../../services/upload.service';
import type { AdminOrderQueryInput, UpdateOrderStatusInput, AdminUserQueryInput, BanUserInput, AuditLogQueryInput } from './admin.schema';

/**
 * Rate limit estricto para rutas admin: 30 requests/minuto.
 */
const ADMIN_RATE_LIMIT = {
  config: {
    rateLimit: { max: 30, timeWindow: '1 minute' },
  },
};

/**
 * Pre-handlers comunes para todas las rutas admin.
 */
const ADMIN_PREHANDLERS = {
  preHandler: [authenticate, requireAdmin, requireMFA, requireAdminSession],
};

/**
 * Registra todas las rutas de administración.
 */
export async function adminRoutes(app: FastifyInstance) {
  // Inicializar Cloudinary
  initCloudinary(app);

  // ==========================================
  // Dashboard Metrics
  // ==========================================
  app.get(
    '/api/admin/dashboard/metrics',
    { ...ADMIN_RATE_LIMIT, ...ADMIN_PREHANDLERS },
    async (request, reply) => {
      const metrics = await getDashboardMetrics(app);

      return reply.status(200).send({
        success: true,
        data: metrics,
      });
    }
  );

  // ==========================================
  // Admin Orders
  // ==========================================
  app.get(
    '/api/admin/orders',
    { ...ADMIN_RATE_LIMIT, ...ADMIN_PREHANDLERS },
    async (request, reply) => {
      const query = request.validate(AdminOrderQuerySchema, 'query') as AdminOrderQueryInput;

      const result = await getAdminOrders({
        status: query.status,
        from: query.from,
        to: query.to,
        userId: query.userId,
        search: query.search,
        page: query.page,
        pageSize: query.pageSize,
      });

      return reply.status(200).send({
        success: true,
        data: result.data,
        meta: {
          total: result.total,
          page: result.page,
          pageSize: result.pageSize,
          totalPages: result.totalPages,
          hasNextPage: result.page < result.totalPages,
          hasPrevPage: result.page > 1,
        },
      });
    }
  );

  app.get(
    '/api/admin/orders/:id',
    { ...ADMIN_RATE_LIMIT, ...ADMIN_PREHANDLERS },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const order = await getAdminOrderDetail(id);

      if (!order) {
        return reply.status(404).send({
          success: false,
          error: { code: 'ORDER_NOT_FOUND', message: 'Orden no encontrada.' },
        });
      }

      return reply.status(200).send({
        success: true,
        data: order,
      });
    }
  );

  app.patch(
    '/api/admin/orders/:id/status',
    { ...ADMIN_RATE_LIMIT, ...ADMIN_PREHANDLERS },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.validate(UpdateOrderStatusSchema, 'body') as UpdateOrderStatusInput;
      const adminId = request.user!.id;
      const ipAddress = request.ip ?? 'unknown';

      const result = await updateOrderStatus(app, {
        orderId: id,
        newStatus: body.status,
        notes: body.notes,
        adminId,
        ipAddress,
      });

      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'INVALID_STATUS_TRANSITION', message: result.error },
        });
      }

      // Invalidar cache del dashboard
      await invalidateDashboardCache(app);

      return reply.status(200).send({
        success: true,
        data: {
          refunded: result.refunded,
          refundAmount: result.refundAmount,
        },
      });
    }
  );

  // ==========================================
  // Admin Users
  // ==========================================
  app.get(
    '/api/admin/users',
    { ...ADMIN_RATE_LIMIT, ...ADMIN_PREHANDLERS },
    async (request, reply) => {
      const query = request.validate(AdminUserQuerySchema, 'query') as AdminUserQueryInput;

      const result = await getAdminUsers({
        search: query.search,
        page: query.page,
        pageSize: query.pageSize,
      });

      return reply.status(200).send({
        success: true,
        data: result.data,
        meta: {
          total: result.total,
          page: result.page,
          pageSize: result.pageSize,
          totalPages: result.totalPages,
          hasNextPage: result.page < result.totalPages,
          hasPrevPage: result.page > 1,
        },
      });
    }
  );

  app.get(
    '/api/admin/users/:id',
    { ...ADMIN_RATE_LIMIT, ...ADMIN_PREHANDLERS },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const user = await getAdminUserDetail(id);

      if (!user) {
        return reply.status(404).send({
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'Usuario no encontrado.' },
        });
      }

      return reply.status(200).send({
        success: true,
        data: user,
      });
    }
  );

  app.patch(
    '/api/admin/users/:id/ban',
    { ...ADMIN_RATE_LIMIT, ...ADMIN_PREHANDLERS },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.validate(BanUserSchema, 'body') as BanUserInput;
      const adminId = request.user!.id;
      const ipAddress = request.ip ?? 'unknown';

      const result = await banUser(app, {
        userId: id,
        reason: body.reason,
        adminId,
        ipAddress,
      });

      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'BAN_FAILED', message: result.error },
        });
      }

      return reply.status(200).send({
        success: true,
        data: { message: 'Usuario baneado exitosamente.' },
      });
    }
  );

  // ==========================================
  // Audit Log
  // ==========================================
  app.get(
    '/api/admin/audit-log',
    { ...ADMIN_RATE_LIMIT, ...ADMIN_PREHANDLERS },
    async (request, reply) => {
      const query = request.validate(AuditLogQuerySchema, 'query') as AuditLogQueryInput;

      const result = await getAuditLog({
        adminId: query.adminId,
        action: query.action,
        entityType: query.entityType,
        from: query.from,
        to: query.to,
        page: query.page,
        pageSize: query.pageSize,
      });

      return reply.status(200).send({
        success: true,
        data: result.data,
        meta: {
          total: result.total,
          page: result.page,
          pageSize: result.pageSize,
          totalPages: result.totalPages,
          hasNextPage: result.page < result.totalPages,
          hasPrevPage: result.page > 1,
        },
      });
    }
  );

  // ==========================================
  // Image Upload
  // ==========================================
  app.post(
    '/api/admin/upload/image',
    { ...ADMIN_RATE_LIMIT, ...ADMIN_PREHANDLERS },
    async (request, reply) => {
      // Nota: Para manejo de archivos multipart, se necesita @fastify/multipart.
      // Por ahora, esta ruta acepta base64 como workaround si multipart no está disponible.
      // En producción, usar multipart con buffer.

      const body = request.body as { image: string; filename?: string; mimeType?: string };
      const adminId = request.user!.id;
      const ipAddress = request.ip ?? 'unknown';

      if (!body.image) {
        return reply.status(400).send({
          success: false,
          error: { code: 'MISSING_IMAGE', message: 'No se proporcionó imagen.' },
        });
      }

      try {
        // Si es base64, decodificar
        const base64Data = body.image.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const filename = body.filename ?? 'upload';
        const mimeType = body.mimeType ?? 'image/jpeg';

        const result = await uploadImage(app, buffer, filename, mimeType, adminId, ipAddress);

        return reply.status(201).send({
          success: true,
          data: result,
        });
      } catch (err) {
        app.log.error({ err }, 'Error al subir imagen');
        return reply.status(400).send({
          success: false,
          error: {
            code: 'UPLOAD_FAILED',
            message: err instanceof Error ? err.message : 'Error al subir imagen.',
          },
        });
      }
    }
  );
}
