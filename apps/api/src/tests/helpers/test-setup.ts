import { beforeAll, afterAll } from 'vitest';

/**
 * Setup global para tests de seguridad.
 *
 * Configura el entorno de test:
 * - Mock de variables de entorno
 * - Limpieza de estado entre tests
 */

beforeAll(() => {
  // Asegurar que NODE_ENV sea 'test'
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test_jwt_secret_32_chars_minimum_length';
  process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_32_chars_minimum_length';
  process.env.CSRF_SECRET = 'test_csrf_secret_32_chars_minimum_';
  process.env.AES_PHONE_KEY = 'test_aes_phone_key_32_chars__';
  process.env.MFA_SECRET_KEY = 'test_mfa_secret_key_32_chars__';
});

afterAll(() => {
  // Cleanup si es necesario
});
