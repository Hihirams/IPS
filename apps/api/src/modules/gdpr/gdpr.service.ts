import bcrypt from 'bcryptjs';
import type { FastifyInstance } from 'fastify';
import { prisma } from '../../lib/prisma';
import { revokeAllUserSessions } from '../auth/jwt.service';
import { sendEmail } from '../../services/email.service';

/**
 * Servicio GDPR: exportación de datos y eliminación de cuenta.
 *
 * Reglas:
 * - Exportar datos: derecho de portabilidad (JSON completo)
 * - Eliminar cuenta: soft delete + anonimización (no borrar órdenes)
 * - Verificar password antes de eliminar
 * - Revocar todas las sesiones
 * - Enviar email de confirmación
 */

// ==========================================
// Exportar datos del usuario
// ==========================================

export async function exportUserData(userId: string): Promise<Record<string, unknown>> {
  // Obtener perfil (sin passwordHash, mfaSecret, datos internos)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      isEmailVerified: true,
      mfaEnabled: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }

  // Obtener órdenes (sin datos sensibles de pago)
  const orders = await prisma.order.findMany({
    where: { userId },
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
      statusHistory: {
        select: { status: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Obtener reseñas
  const reviews = await prisma.review.findMany({
    where: { userId },
    select: {
      id: true,
      rating: true,
      title: true,
      body: true,
      isVerifiedPurchase: true,
      isApproved: true,
      createdAt: true,
      product: { select: { name: true, sku: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Obtener direcciones
  const addresses = await prisma.address.findMany({
    where: { userId },
    select: {
      id: true,
      label: true,
      street: true,
      city: true,
      state: true,
      zipCode: true,
      country: true,
      isDefault: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  // Obtener sesiones (solo metadata, sin tokens)
  const sessions = await prisma.session.findMany({
    where: { userId },
    select: {
      id: true,
      deviceInfo: true,
      ipAddress: true,
      expiresAt: true,
      revokedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return {
    exportDate: new Date().toISOString(),
    user,
    orders,
    reviews,
    addresses,
    sessions,
  };
}

// ==========================================
// Eliminar cuenta de usuario
// ==========================================

export async function deleteUserAccount(
  app: FastifyInstance,
  userId: string,
  password: string
): Promise<void> {
  // 1. Verificar password
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, passwordHash: true, email: true, name: true },
  });

  if (!user || !user.passwordHash) {
    throw new Error('USER_NOT_FOUND');
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) {
    throw new Error('INVALID_PASSWORD');
  }

  // 2. Revocar todas las sesiones
  await revokeAllUserSessions(app, userId);

  // 3. Anonimizar datos (no borrar órdenes, solo datos personales)
  // Usar un email único anonimizado para evitar conflictos de unique constraint
  const anonymousEmail = `deleted_${userId}@anon.invalid`;
  const anonymousName = 'Usuario Eliminado';
  const randomPasswordHash = await bcrypt.hash(crypto.randomUUID(), 12);

  await prisma.user.update({
    where: { id: userId },
    data: {
      email: anonymousEmail,
      name: anonymousName,
      phone: null,
      passwordHash: randomPasswordHash,
      mfaEnabled: false,
      mfaSecret: null,
      isEmailVerified: false,
      failedLoginAttempts: 0,
      lastFailedLogin: null,
      deletedAt: new Date(),
    },
  });

  // 4. Anonimizar direcciones (reemplazar datos sensibles)
  await prisma.address.updateMany({
    where: { userId },
    data: {
      street: 'Dirección eliminada',
      city: 'Eliminado',
      state: 'Eliminado',
      zipCode: '00000',
    },
  });

  // 5. Anonimizar reseñas (mantener el contenido pero desvincular del usuario)
  await prisma.review.updateMany({
    where: { userId },
    data: {
      title: '[Reseña de usuario eliminado]',
      body: '[Contenido de reseña de usuario eliminado]',
    },
  });

  // 6. Enviar email de confirmación (no bloqueante)
  sendEmail(app, {
    to: user.email,
    subject: 'Tu cuenta ha sido eliminada',
    html: `
      <h1>Cuenta eliminada</h1>
      <p>Hola ${user.name},</p>
      <p>Tu cuenta ha sido eliminada exitosamente. Tus datos personales han sido anonimizados.</p>
      <p>Si no solicitaste esta eliminación, contacta a soporte inmediatamente.</p>
    `,
    text: 'Tu cuenta ha sido eliminada exitosamente. Tus datos personales han sido anonimizados. Si no solicitaste esta eliminación, contacta a soporte inmediatamente.',
  }).catch((err) => {
    app.log.error({ err, userId }, 'Error al enviar email de confirmación de eliminación');
  });
}
