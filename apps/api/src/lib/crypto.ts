import crypto from 'crypto';

/**
 * Genera un número de orden único con el formato ECO-YYYYMMDD-XXXX.
 * Ejemplo: ECO-20260516-A3F2
 */
export function generateOrderNumber(): string {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ECO-${datePart}-${randomPart}`;
}

/**
 * Configuración de cifrado AES-256-GCM para el campo phone.
 * NOTA: En producción, AES_KEY debe provenir de un vault seguro (HashiCorp Vault, AWS KMS, etc.)
 * y nunca debe estar hardcodeada.
 */
const AES_ALGORITHM = 'aes-256-gcm';
const AES_IV_LENGTH = 16;
const AES_TAG_LENGTH = 16;

function getKey(): Buffer {
  const key = process.env.AES_PHONE_KEY;
  if (!key) {
    throw new Error(
      'AES_PHONE_KEY no está configurada. ' +
        'Esta variable es obligatoria para cifrar/descifrar números de teléfono.'
    );
  }
  // Derivar una clave de 32 bytes desde la env usando SHA-256
  return crypto.createHash('sha256').update(key).digest();
}

/**
 * Cifra un número de teléfono usando AES-256-GCM.
 * Retorna el ciphertext en formato base64 (iv:tag:ciphertext).
 */
export function encryptPhone(phone: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(AES_IV_LENGTH);
  const cipher = crypto.createCipheriv(AES_ALGORITHM, key, iv);

  let encrypted = cipher.update(phone, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const tag = cipher.getAuthTag();

  // Formato: iv:tag:ciphertext (todo en base64)
  const payload = Buffer.concat([iv, tag, Buffer.from(encrypted, 'base64')]);
  return payload.toString('base64');
}

/**
 * Descifra un número de teléfono cifrado con AES-256-GCM.
 * Espera el formato base64 generado por encryptPhone.
 */
export function decryptPhone(encryptedPhone: string): string {
  const key = getKey();
  const payload = Buffer.from(encryptedPhone, 'base64');

  const iv = payload.subarray(0, AES_IV_LENGTH);
  const tag = payload.subarray(AES_IV_LENGTH, AES_IV_LENGTH + AES_TAG_LENGTH);
  const ciphertext = payload.subarray(AES_IV_LENGTH + AES_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(AES_ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(ciphertext.toString('base64'), 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
