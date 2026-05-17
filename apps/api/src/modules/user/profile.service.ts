import { prisma } from '../../lib/prisma';
import bcrypt from 'bcryptjs';
import { encryptPhone, decryptPhone } from '../../lib/crypto';
import { revokeAllUserSessionsExcept } from '../auth/jwt.service';
import { revokeAdminSession } from '../../middleware/admin-auth.middleware';
import type { FastifyInstance } from 'fastify';
import { sendPasswordChangedNotification } from '../../services/email.service';

/**
 * Servicio de perfil de usuario.
 */

/**
 * Obtiene el perfil del usuario (sin datos sensibles).
 */
export async function getUserProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId, deletedAt: null },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      isEmailVerified: true,
      mfaEnabled: true,
      createdAt: true,
    },
  });

  if (!user) return null;

  // Descifrar teléfono si existe
  const phone = user.phone ? decryptPhone(user.phone) : null;

  return {
    ...user,
    phone,
  };
}

/**
 * Actualiza el perfil del usuario.
 */
export async function updateUserProfile(
  userId: string,
  data: { name?: string; phone?: string }
) {
  const updateData: Record<string, unknown> = {};

  if (data.name !== undefined) {
    updateData.name = data.name.trim();
  }

  if (data.phone !== undefined) {
    // Validar formato E.164 básico
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    const cleanedPhone = data.phone.replace(/\s/g, '');
    if (cleanedPhone && !phoneRegex.test(cleanedPhone)) {
      throw new Error('INVALID_PHONE_FORMAT');
    }
    updateData.phone = cleanedPhone ? encryptPhone(cleanedPhone) : null;
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      isEmailVerified: true,
      mfaEnabled: true,
      createdAt: true,
    },
  });

  return {
    ...updated,
    phone: updated.phone ? decryptPhone(updated.phone) : null,
  };
}

/**
 * Cambia la contraseña del usuario.
 * Revoca todas las sesiones excepto la actual.
 */
export async function changeUserPassword(
  app: FastifyInstance,
  {
    userId,
    currentSessionId,
    currentPassword,
    newPassword,
  }: {
    userId: string;
    currentSessionId: string;
    currentPassword: string;
    newPassword: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId, deletedAt: null },
    select: {
      passwordHash: true,
      email: true,
      name: true,
    },
  });

  if (!user) {
    return { success: false, error: 'Usuario no encontrado.' };
  }

  // Verificar contraseña actual
  const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isValid) {
    return { success: false, error: 'La contraseña actual es incorrecta.' };
  }

  // Hashear nueva contraseña
  const newPasswordHash = await bcrypt.hash(newPassword, 12);

  // Actualizar en DB
  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: newPasswordHash,
      failedLoginAttempts: 0,
      lastFailedLogin: null,
    },
  });

  // Revocar todas las sesiones excepto la actual
  await revokeAllUserSessionsExcept(app, userId, currentSessionId);

  // Enviar notificación por email
  await sendPasswordChangedNotification(app, {
    userEmail: user.email,
    userName: user.name,
  });

  app.log.info({ userId }, 'Contraseña cambiada exitosamente');

  return { success: true };
}
