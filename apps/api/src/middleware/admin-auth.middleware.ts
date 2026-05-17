import type { FastifyRequest, FastifyReply, preHandlerHookHandler } from 'fastify';
import { prisma } from '../lib/prisma';
import { alertAdminNewIp } from '../services/alert.service';

/**
 * Middleware: requiere que el usuario tenga MFA habilitado.
 * Debe usarse DESPUÉS de authenticate y requireAdmin.
 * Si no tiene MFA configurado, devuelve 403 MFA_REQUIRED.
 */
export const requireMFA: preHandlerHookHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const user = request.user;

  if (!user) {
    return reply.status(401).send({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Se requiere autenticación.',
      },
    });
  }

  // Verificar MFA en la base de datos (el JWT no incluye este campo)
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { mfaEnabled: true },
  });

  if (!dbUser?.mfaEnabled) {
    return reply.status(403).send({
      success: false,
      error: {
        code: 'MFA_REQUIRED',
        message: 'Se requiere autenticación de dos factores (MFA) para acceder al panel de administración.',
      },
    });
  }
};

/**
 * Middleware: requiere que la sesión de admin esté activa (30 minutos de inactividad).
 * Usa Redis con TTL de 1800 segundos (30 min).
 * Cada request refresca el TTL.
 */
export const requireAdminSession: preHandlerHookHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const user = request.user;

  if (!user) {
    return reply.status(401).send({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Se requiere autenticación.',
      },
    });
  }

  const redis = request.server.redis;
  const sessionKey = `admin_session:${user.id}`;

  // Verificar si existe la sesión de admin
  const exists = await redis.exists(sessionKey);

  if (!exists) {
    return reply.status(401).send({
      success: false,
      error: {
        code: 'ADMIN_SESSION_EXPIRED',
        message: 'La sesión de administrador ha expirado por inactividad. Por favor inicia sesión nuevamente.',
      },
    });
  }

  // Refrescar el TTL (30 minutos)
  await redis.expire(sessionKey, 30 * 60);

  // SECURITY: Detectar acceso desde IP nueva para admins
  const ipAddress = request.ip ?? 'unknown';
  const deviceInfo = request.headers['user-agent'] ?? 'unknown';
  const knownIpKey = `admin_known_ips:${user.id}`;
  const knownIpsRaw = await redis.get(knownIpKey);
  const knownIps = knownIpsRaw ? JSON.parse(knownIpsRaw) as string[] : [];

  if (!knownIps.includes(ipAddress)) {
    // Obtener email del admin para la alerta
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { email: true },
    });

    if (dbUser) {
      // Enviar alerta (no bloqueante)
      alertAdminNewIp(request.server, user.id, dbUser.email, ipAddress, deviceInfo).catch((err) => {
        request.server.log.error({ err, userId: user.id, ip: ipAddress }, 'Error al enviar alerta de admin new IP');
      });
    }

    // Agregar IP a la lista de conocidas (guardar últimas 5 IPs)
    knownIps.push(ipAddress);
    if (knownIps.length > 5) knownIps.shift();
    await redis.set(knownIpKey, JSON.stringify(knownIps));
  }
};

/**
 * Inicializa la sesión de admin en Redis.
 * Llamar esto cuando un admin inicia sesión exitosamente.
 */
export async function initAdminSession(
  redis: import('ioredis').Redis,
  userId: string
): Promise<void> {
  await redis.set(`admin_session:${userId}`, Date.now().toString(), 'EX', 30 * 60);
}

/**
 * Revoca la sesión de admin en Redis.
 * Llamar esto cuando un admin cierra sesión o es baneado.
 */
export async function revokeAdminSession(
  redis: import('ioredis').Redis,
  userId: string
): Promise<void> {
  await redis.del(`admin_session:${userId}`);
}
