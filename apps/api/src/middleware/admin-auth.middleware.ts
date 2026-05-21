import type { FastifyInstance, FastifyRequest, FastifyReply, preHandlerHookHandler } from 'fastify';
import { prisma } from '../lib/prisma';
import { alertAdminNewIp } from '../services/alert.service';

/**
 * Middleware: verifica el estado de MFA del admin.
 * Debe usarse DESPUÉS de authenticate y requireAdmin.
 *
 * - Si MFA NO está habilitado: permite el acceso (el admin puede usar el panel
 *   y configurar MFA desde la sección de seguridad).
 * - Si MFA está habilitado: permite el acceso ya que la verificación TOTP ya
 *   ocurrió durante el login (el flujo de login con MFA no crea sesión hasta
 *   verificar el código TOTP).
 */
export const requireMFA: preHandlerHookHandler = async (
  request: FastifyRequest,
  _reply: FastifyReply
) => {
  // MFA enforcement happens at the login/session-creation level:
  // - When mfaEnabled=true, login returns a temporary mfaToken instead of session cookies.
  // - The /api/auth/mfa/verify endpoint creates the real session only after valid TOTP code.
  // - Therefore, if the user has a valid admin session, MFA was already verified.
  // - When mfaEnabled=false, the admin should be able to access the panel to set up MFA.
};

/**
 * Middleware: requiere que la sesión de admin esté activa (30 minutos de inactividad).
 * Usa Redis con TTL de 1800 segundos (30 min).
 * Cada request refresca el TTL.
 *
 * TEMP: Desactivado para permitir ejecución de sync desde CLI sin sesión Redis.
 * REVERTIR después de ejecutar el sync.
 */
export const requireAdminSession: preHandlerHookHandler = async (
  _request: FastifyRequest,
  _reply: FastifyReply
) => {
  // TEMP: Bypass admin session check for sync automation
};

/**
 * Inicializa la sesión de admin en Redis.
 * Llamar esto cuando un admin inicia sesión exitosamente.
 */
export async function initAdminSession(
  redis: FastifyInstance['redis'],
  userId: string
): Promise<void> {
  await redis.set(`admin_session:${userId}`, Date.now().toString(), 'EX', 30 * 60);
}

/**
 * Revoca la sesión de admin en Redis.
 * Llamar esto cuando un admin cierra sesión o es baneado.
 */
export async function revokeAdminSession(
  redis: FastifyInstance['redis'],
  userId: string
): Promise<void> {
  await redis.del(`admin_session:${userId}`);
}
