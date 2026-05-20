import crypto from 'crypto';
import type { FastifyInstance } from 'fastify';
import { Role } from '@prisma/client';
import { prisma } from '../../lib/prisma';

/**
 * Servicio JWT: generación, rotación y revocación de tokens.
 *
 * Reglas:
 * - Access token: 15 minutos, firmado con JWT_SECRET
 * - Refresh token: 7 días, firmado con JWT_REFRESH_SECRET
 * - Rotación: al refrescar, el token anterior se revoca y se genera uno nuevo
 * - Revocación: tokens revocados se guardan en blacklist de Redis
 * - Timing-safe comparison para hashes de tokens
 */

const ACCESS_EXPIRY_SECONDS = 15 * 60; // 15 minutos
const REFRESH_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 días

/**
 * Genera un hash SHA-256 de un token para almacenarlo en DB.
 */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Compara dos hashes de forma timing-safe.
 */
function safeCompareHash(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Calcula los segundos restantes de vida de un token JWT.
 */
function getRemainingSeconds(exp: number): number {
  const now = Math.floor(Date.now() / 1000);
  return Math.max(0, exp - now);
}

// ==========================================
// Generar par de tokens
// ==========================================

export async function generateTokenPair(
  app: FastifyInstance,
  userId: string,
  role: Role,
  deviceInfo?: string,
  ipAddress?: string
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number; sessionId: string }> {
  const now = Math.floor(Date.now() / 1000);

  // Guardar hash del refresh token en Session PRIMERO para obtener el sessionId
  const refreshToken = app.jwt.sign(
    { sub: userId, role } as { sub: string; role: Role },
    { expiresIn: REFRESH_EXPIRY_SECONDS, key: app.config.JWT_REFRESH_SECRET }
  );

  const refreshTokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_EXPIRY_SECONDS * 1000);

  const session = await prisma.session.create({
    data: {
      userId,
      refreshTokenHash,
      deviceInfo: deviceInfo ?? null,
      ipAddress: ipAddress ?? null,
      expiresAt,
    },
  });

  const sessionId = session.id;

  // Access token: 15 minutos (incluye sessionId para identificar sesión actual)
  const accessToken = app.jwt.sign(
    { sub: userId, role, sessionId } as { sub: string; role: Role; sessionId: string },
    { expiresIn: ACCESS_EXPIRY_SECONDS }
  );

  return { accessToken, refreshToken, expiresIn: ACCESS_EXPIRY_SECONDS, sessionId };
}

// ==========================================
// Refrescar access token
// ==========================================

export async function refreshAccessToken(
  app: FastifyInstance,
  refreshToken: string
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  // 1. Verificar firma del refresh token
  let payload: { sub: string; role: Role; iat: number; exp: number };
  try {
    payload = app.jwt.verify<{ sub: string; role: Role; iat: number; exp: number }>(
      refreshToken,
      { key: app.config.JWT_REFRESH_SECRET }
    );
  } catch {
    throw new Error('INVALID_REFRESH_TOKEN');
  }

  // 2. Verificar que no esté en blacklist de Redis
  const tokenHash = hashToken(refreshToken);
  const isBlacklisted = await app.redis.get(`bl:rt:${tokenHash}`);
  if (isBlacklisted) {
    throw new Error('BLACKLISTED_REFRESH_TOKEN');
  }

  // 3. Verificar sesión en DB
  const session = await prisma.session.findFirst({
    where: {
      userId: payload.sub,
      refreshTokenHash: tokenHash,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (!session) {
    throw new Error('SESSION_NOT_FOUND');
  }

  // 4. Revocar el token anterior
  const remainingSeconds = getRemainingSeconds(payload.exp);
  if (remainingSeconds > 0) {
    await app.redis.setex(`bl:rt:${tokenHash}`, remainingSeconds, '1');
  }

  await prisma.session.update({
    where: { id: session.id },
    data: { revokedAt: new Date() },
  });

  // 5. Generar nuevo par de tokens (rotación)
  const ipAddress = session.ipAddress ?? undefined;
  const deviceInfo = session.deviceInfo ?? undefined;

  return generateTokenPair(app, payload.sub, payload.role, deviceInfo, ipAddress);
}

// ==========================================
// Revocar refresh token
// ==========================================

export async function revokeRefreshToken(
  app: FastifyInstance,
  refreshToken: string
): Promise<void> {
  let payload: { sub: string; role: Role; exp: number };
  try {
    payload = app.jwt.verify<{ sub: string; role: Role; exp: number }>(
      refreshToken,
      { key: app.config.JWT_REFRESH_SECRET }
    );
  } catch {
    // Token inválido o expirado: intentar buscar por hash de todas formas
    const tokenHash = hashToken(refreshToken);
    await app.redis.setex(`bl:rt:${tokenHash}`, REFRESH_EXPIRY_SECONDS, '1');
    return;
  }

  const tokenHash = hashToken(refreshToken);
  const remainingSeconds = getRemainingSeconds(payload.exp);

  // Agregar a blacklist Redis
  if (remainingSeconds > 0) {
    await app.redis.setex(`bl:rt:${tokenHash}`, remainingSeconds, '1');
  }

  // Marcar como revocado en DB
  await prisma.session.updateMany({
    where: {
      userId: payload.sub,
      refreshTokenHash: tokenHash,
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });
}

// ==========================================
// Revocar todas las sesiones de un usuario
// ==========================================

export async function revokeAllUserSessions(
  app: FastifyInstance,
  userId: string
): Promise<void> {
  // 1. Obtener sesiones activas ANTES de revocarlas (fix race condition)
  const activeSessions = await prisma.session.findMany({
    where: {
      userId,
      revokedAt: null,
    },
    select: { id: true, refreshTokenHash: true },
  });

  if (activeSessions.length === 0) return;

  // 2. Marcar todas como revocadas
  await prisma.session.updateMany({
    where: {
      userId,
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });

  // 3. Agregar a blacklist Redis
  for (const session of activeSessions) {
    await app.redis.setex(
      `bl:rt:${session.refreshTokenHash}`,
      REFRESH_EXPIRY_SECONDS,
      '1'
    );
  }
}

// ==========================================
// Revocar todas las sesiones excepto la actual
// ==========================================

export async function revokeAllUserSessionsExcept(
  app: FastifyInstance,
  userId: string,
  currentSessionId: string
): Promise<void> {
  // 1. Obtener sesiones activas excepto la actual
  const activeSessions = await prisma.session.findMany({
    where: {
      userId,
      revokedAt: null,
      id: { not: currentSessionId },
    },
    select: { id: true, refreshTokenHash: true },
  });

  if (activeSessions.length === 0) return;

  // 2. Marcar como revocadas
  await prisma.session.updateMany({
    where: {
      userId,
      revokedAt: null,
      id: { not: currentSessionId },
    },
    data: { revokedAt: new Date() },
  });

  // 3. Agregar a blacklist Redis
  for (const session of activeSessions) {
    await app.redis.setex(
      `bl:rt:${session.refreshTokenHash}`,
      REFRESH_EXPIRY_SECONDS,
      '1'
    );
  }
}

// ==========================================
// Helpers exportables
// ==========================================

export { hashToken, safeCompareHash };
