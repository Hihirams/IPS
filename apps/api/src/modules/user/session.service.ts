import { prisma } from '../../lib/prisma';
import { revokeRefreshToken, hashToken } from '../auth/jwt.service';
import type { FastifyInstance } from 'fastify';

/**
 * Servicio de gestión de sesiones del usuario.
 */

/**
 * Lista las sesiones activas del usuario.
 */
export async function getUserSessions(userId: string) {
  return prisma.session.findMany({
    where: {
      userId,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      deviceInfo: true,
      ipAddress: true,
      createdAt: true,
      expiresAt: true,
    },
  });
}

/**
 * Revoca una sesión específica del usuario.
 */
export async function revokeUserSession(
  app: FastifyInstance,
  sessionId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await prisma.session.findFirst({
    where: {
      id: sessionId,
      userId,
      revokedAt: null,
    },
  });

  if (!session) {
    return { success: false, error: 'Sesión no encontrada.' };
  }

  // Agregar a blacklist de Redis
  await app.redis.setex(
    `bl:rt:${session.refreshTokenHash}`,
    7 * 24 * 60 * 60, // 7 días máximo
    '1'
  );

  // Marcar como revocada en DB
  await prisma.session.update({
    where: { id: sessionId },
    data: { revokedAt: new Date() },
  });

  return { success: true };
}

/**
 * Revoca TODAS las sesiones del usuario excepto la actual.
 */
export async function revokeAllOtherSessions(
  app: FastifyInstance,
  userId: string,
  currentSessionId: string
): Promise<{ success: boolean; error?: string }> {
  const sessions = await prisma.session.findMany({
    where: {
      userId,
      revokedAt: null,
      id: { not: currentSessionId },
    },
    select: { id: true, refreshTokenHash: true },
  });

  if (sessions.length === 0) {
    return { success: true };
  }

  // Agregar a blacklist de Redis
  for (const session of sessions) {
    await app.redis.setex(
      `bl:rt:${session.refreshTokenHash}`,
      7 * 24 * 60 * 60,
      '1'
    );
  }

  // Marcar como revocadas en DB
  await prisma.session.updateMany({
    where: {
      userId,
      revokedAt: null,
      id: { not: currentSessionId },
    },
    data: { revokedAt: new Date() },
  });

  return { success: true };
}
