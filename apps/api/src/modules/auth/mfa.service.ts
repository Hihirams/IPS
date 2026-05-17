import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { prisma } from '../../lib/prisma';
import type { MFASetupResponse } from '@ecommerce/types';

/**
 * Servicio MFA con TOTP usando otplib.
 *
 * - Genera secretos TOTP únicos por usuario
 * - Proporciona QR code para escaneo con apps autenticadoras
 * - Verifica códigos con ventana de 1 (permite ±1 paso temporal)
 * - Cifra el secreto TOTP antes de guardarlo en BD
 */

// Issuer que aparece en la app autenticadora
const MFA_ISSUER = 'EcommerceTech';

/**
 * Obtiene la clave de cifrado para MFA secrets.
 */
function getMfaKey(): Buffer {
  const key = process.env.MFA_SECRET_KEY || process.env.AES_PHONE_KEY;
  if (!key) {
    throw new Error(
      'MFA_SECRET_KEY o AES_PHONE_KEY no configuradas. ' +
        'Son obligatorias para cifrar secretos MFA.'
    );
  }
  return crypto.createHash('sha256').update(key).digest();
}

/**
 * Cifra un secreto MFA con AES-256-GCM.
 */
function encryptMfaSecret(secret: string): string {
  const key = getMfaKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(secret, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const tag = cipher.getAuthTag();
  const payload = Buffer.concat([iv, tag, Buffer.from(encrypted, 'base64')]);
  return payload.toString('base64');
}

/**
 * Descifra un secreto MFA cifrado.
 */
function decryptMfaSecret(encryptedSecret: string): string {
  const key = getMfaKey();
  const payload = Buffer.from(encryptedSecret, 'base64');

  const iv = payload.subarray(0, 16);
  const tag = payload.subarray(16, 32);
  const ciphertext = payload.subarray(32);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(ciphertext.toString('base64'), 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

// ==========================================
// Generar secreto MFA
// ==========================================

export async function generateMFASecret(
  userId: string,
  userEmail: string
): Promise<MFASetupResponse> {
  const secret = authenticator.generateSecret();

  const otpauthUrl = authenticator.keyuri(userEmail, MFA_ISSUER, secret);
  const qrCodeUrl = await QRCode.toDataURL(otpauthUrl);

  // Guardar secreto cifrado temporalmente (sin activar MFA aún)
  const encryptedSecret = encryptMfaSecret(secret);

  await prisma.user.update({
    where: { id: userId },
    data: { mfaSecret: encryptedSecret },
  });

  return {
    secret, // Solo para entrada manual
    qrCodeUrl,
    manualEntry: secret,
  };
}

// ==========================================
// Verificar código MFA
// ==========================================

export async function verifyMFACode(userId: string, code: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { mfaSecret: true, mfaEnabled: true },
  });

  if (!user?.mfaSecret) {
    return false;
  }

  const secret = decryptMfaSecret(user.mfaSecret);
  return authenticator.verify({ token: code, secret, window: 1 });
}

// ==========================================
// Habilitar MFA
// ==========================================

export async function enableMFA(userId: string, code: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { mfaSecret: true, mfaEnabled: true },
  });

  if (!user?.mfaSecret || user.mfaEnabled) {
    return false;
  }

  const secret = decryptMfaSecret(user.mfaSecret);
  const isValid = authenticator.verify({ token: code, secret, window: 1 });

  if (!isValid) {
    return false;
  }

  await prisma.user.update({
    where: { id: userId },
    data: { mfaEnabled: true },
  });

  return true;
}

// ==========================================
// Deshabilitar MFA
// ==========================================

export async function disableMFA(userId: string, code: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { mfaSecret: true, mfaEnabled: true },
  });

  if (!user?.mfaSecret || !user.mfaEnabled) {
    return false;
  }

  const secret = decryptMfaSecret(user.mfaSecret);
  const isValid = authenticator.verify({ token: code, secret, window: 1 });

  if (!isValid) {
    return false;
  }

  await prisma.user.update({
    where: { id: userId },
    data: { mfaSecret: null, mfaEnabled: false },
  });

  return true;
}

// ==========================================
// Helper: verificar si MFA es requerido
// ==========================================

export async function isMFAEnabled(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { mfaEnabled: true },
  });
  return user?.mfaEnabled ?? false;
}
