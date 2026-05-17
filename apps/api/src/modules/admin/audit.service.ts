import { prisma } from '../../lib/prisma';
import type { FastifyInstance } from 'fastify';

/**
 * Servicio de auditoría de admin.
 * Registra TODAS las acciones de administradores en la tabla AdminAuditLog.
 * Esta tabla es INMUTABLE: nunca se permiten UPDATE ni DELETE.
 */

export type AdminAction =
  | 'CREATE_PRODUCT'
  | 'UPDATE_PRODUCT'
  | 'DELETE_PRODUCT'
  | 'UPDATE_STOCK'
  | 'UPDATE_ORDER_STATUS'
  | 'CANCEL_ORDER'
  | 'REFUND_ORDER'
  | 'BAN_USER'
  | 'UPLOAD_IMAGE'
  | 'APPROVE_REVIEW'
  | 'DELETE_REVIEW'
  | 'ADMIN_LOGIN';

/**
 * Registra una acción de admin en la tabla AdminAuditLog.
 * Debe llamarse en CADA operación de admin.
 */
export async function logAdminAction(
  adminId: string,
  action: AdminAction,
  entityType: string,
  entityId: string,
  oldValues?: Record<string, unknown> | null,
  newValues?: Record<string, unknown> | null,
  ipAddress?: string
): Promise<void> {
  await prisma.adminAuditLog.create({
    data: {
      adminId,
      action,
      entityType,
      entityId,
      oldValues: oldValues ?? null,
      newValues: newValues ?? null,
      ipAddress: ipAddress ?? null,
    },
  });
}

/**
 * Obtiene el historial de auditoría paginado con filtros.
 */
export async function getAuditLog({
  adminId,
  action,
  entityType,
  from,
  to,
  page,
  pageSize,
}: {
  adminId?: string;
  action?: string;
  entityType?: string;
  from?: Date;
  to?: Date;
  page: number;
  pageSize: number;
}) {
  const where: Record<string, unknown> = {};

  if (adminId) where.adminId = adminId;
  if (action) where.action = action;
  if (entityType) where.entityType = entityType;
  if (from || to) {
    where.createdAt = {};
    if (from) (where.createdAt as Record<string, Date>).gte = from;
    if (to) (where.createdAt as Record<string, Date>).lte = to;
  }

  const [data, total] = await Promise.all([
    prisma.adminAuditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        admin: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    }),
    prisma.adminAuditLog.count({ where }),
  ]);

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}
