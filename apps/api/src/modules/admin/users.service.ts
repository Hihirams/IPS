import { prisma } from '../../lib/prisma';
import { revokeAllUserSessions } from '../auth/jwt.service';
import type { FastifyInstance } from 'fastify';
import { logAdminAction } from './audit.service';
import { notifyAccountBanned } from '../../services/email.service';
import { revokeAdminSession } from '../../middleware/admin-auth.middleware';

/**
 * Servicio de gestión de usuarios para administradores.
 */

/**
 * Obtiene lista paginada de usuarios con búsqueda.
 */
export async function getAdminUsers({
  search,
  page,
  pageSize,
}: {
  search?: string;
  page: number;
  pageSize: number;
}) {
  const where: Record<string, unknown> = {
    deletedAt: null,
  };

  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { name: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isEmailVerified: true,
        isBanned: true,
        mfaEnabled: true,
        createdAt: true,
        _count: {
          select: {
            orders: true,
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    data: data.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      isBanned: user.isBanned,
      mfaEnabled: user.mfaEnabled,
      createdAt: user.createdAt,
      orderCount: user._count.orders,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Obtiene detalle de un usuario con órdenes y sesiones activas.
 */
export async function getAdminUserDetail(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId, deletedAt: null },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      isEmailVerified: true,
      isBanned: true,
      mfaEnabled: true,
      createdAt: true,
      orders: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          total: true,
          createdAt: true,
        },
      },
      sessions: {
        where: {
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
        select: {
          id: true,
          deviceInfo: true,
          ipAddress: true,
          createdAt: true,
          expiresAt: true,
        },
      },
    },
  });

  if (!user) return null;

  return {
    ...user,
    orders: user.orders.map((order) => ({
      ...order,
      total: Number(order.total),
    })),
  };
}

/**
 * Banea un usuario: marca como baneado, revoca sesiones, notifica.
 */
export async function banUser(
  app: FastifyInstance,
  {
    userId,
    reason,
    adminId,
    ipAddress,
  }: {
    userId: string;
    reason: string;
    adminId: string;
    ipAddress?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId, deletedAt: null },
    select: {
      email: true,
      name: true,
      isBanned: true,
    },
  });

  if (!user) {
    return { success: false, error: 'Usuario no encontrado.' };
  }

  if (user.isBanned) {
    return { success: false, error: 'El usuario ya está baneado.' };
  }

  // Ejecutar en transacción
  await prisma.$transaction(async (tx) => {
    // Marcar como baneado
    await tx.user.update({
      where: { id: userId },
      data: { isBanned: true },
    });

    // Revocar todas las sesiones activas en DB
    await tx.session.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  });

  // Revocar sesiones en Redis
  await revokeAllUserSessions(app, userId);

  // Revocar sesión de admin si el usuario baneado es admin
  await revokeAdminSession(app.redis, userId);

  // Registrar en audit log
  await logAdminAction(
    adminId,
    'BAN_USER',
    'user',
    userId,
    { isBanned: false },
    { isBanned: true, reason },
    ipAddress
  );

  // Notificar al usuario
  await notifyAccountBanned(app, {
    userEmail: user.email,
    userName: user.name,
    reason,
  });

  app.log.warn({ userId, adminId, reason }, 'Usuario baneado');

  return { success: true };
}
