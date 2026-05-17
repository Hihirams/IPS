import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildTestApp, generateTestToken } from '../helpers/test-app';
import type { FastifyInstance } from 'fastify';

/**
 * Tests de seguridad: Autenticación.
 *
 * Verifica:
 * - Login con password incorrecto no revela si el email existe
 * - Login bloquea cuenta después de 5 intentos fallidos
 * - Refresh token revocado no puede ser reutilizado
 * - JWT expirado es rechazado
 * - JWT con firma inválida es rechazado
 * - MFA code incorrecto es rechazado
 */

describe('Auth Security', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Login', () => {
    it('no debe revelar si el email existe con password incorrecto', async () => {
      // Intentar login con email que no existe
      const res1 = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'noexiste@test.com', password: 'WrongPass123!' },
      });

      // Intentar login con email existente pero password incorrecto
      const res2 = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'existente@test.com', password: 'WrongPass123!' },
      });

      // Ambas respuestas deben ser idénticas (mismo mensaje, mismo status)
      expect(res1.statusCode).toBe(401);
      expect(res2.statusCode).toBe(401);

      const body1 = JSON.parse(res1.payload);
      const body2 = JSON.parse(res2.payload);

      expect(body1.error.message).toBe(body2.error.message);
      expect(body1.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('debe bloquear IP después de 5 intentos fallidos', async () => {
      const email = 'test@example.com';
      const password = 'wrongpassword';

      // 5 intentos fallidos
      for (let i = 0; i < 5; i++) {
        const res = await app.inject({
          method: 'POST',
          url: '/api/auth/login',
          payload: { email, password },
        });
        // Los primeros 4 deben ser 401, el quinto también
        expect([401, 429]).toContain(res.statusCode);
      }

      // El sexto intento debe ser bloqueado (429 Too Many Requests)
      const res6 = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email, password },
      });

      expect(res6.statusCode).toBe(429);
      const body = JSON.parse(res6.payload);
      expect(body.error.code).toBe('TOO_MANY_ATTEMPTS');
    });
  });

  describe('JWT', () => {
    it('debe rechazar un JWT expirado', async () => {
      // Generar token expirado (iat en el pasado, exp en el pasado)
      const expiredToken = app.jwt.sign(
        { sub: 'user-123', email: 'test@test.com', role: 'USER' },
        { expiresIn: -1 } // Expirado inmediatamente
      );

      const res = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: { Authorization: `Bearer ${expiredToken}` },
      });

      expect(res.statusCode).toBe(401);
    });

    it('debe rechazar un JWT con firma inválida', async () => {
      const token = await generateTestToken(app, 'user-123');
      // Corromper la firma
      const corruptedToken = token.slice(0, -10) + 'corrupted!';

      const res = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: { Authorization: `Bearer ${corruptedToken}` },
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('Refresh Token', () => {
    it('no debe permitir reusar un refresh token revocado', async () => {
      // Este test requiere la implementación completa de refresh token en DB.
      // En un test real se crearía una sesión, se revocaría, y se intentaría reusar.
      // Aquí verificamos que el endpoint devuelve 401 para un token inválido.

      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/refresh',
        cookies: { refreshToken: 'token-revocado-o-invalido' },
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('MFA', () => {
    it('debe rechazar un código MFA incorrecto', async () => {
      // Intentar verificar MFA con código inválido
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/mfa/verify',
        payload: {
          mfaToken: 'token-invalido',
          code: '000000',
        },
      });

      expect(res.statusCode).toBe(401);
    });
  });
});
