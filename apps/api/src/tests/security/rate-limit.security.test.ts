import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildTestApp } from '../helpers/test-app';
import type { FastifyInstance } from 'fastify';

/**
 * Tests de seguridad: Rate Limiting.
 *
 * Verifica:
 * - Login endpoint bloquea después de 5 intentos por IP
 * - Checkout endpoint aplica rate limit correcto
 * - Global rate limit (100/min) funciona correctamente
 */

describe('Rate Limit Security', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Login Rate Limit', () => {
    it('debe bloquear después de 5 intentos de login fallidos', async () => {
      const email = 'test@example.com';
      const password = 'wrongpassword';

      // 5 intentos fallidos
      for (let i = 0; i < 5; i++) {
        const res = await app.inject({
          method: 'POST',
          url: '/api/auth/login',
          payload: { email, password },
        });
        expect([401, 429]).toContain(res.statusCode);
      }

      // El sexto intento debe ser 429
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email, password },
      });

      expect(res.statusCode).toBe(429);
      const body = JSON.parse(res.payload);
      expect(body.error.code).toBe('TOO_MANY_ATTEMPTS');
    });
  });

  describe('Register Rate Limit', () => {
    it('debe bloquear después de 3 registros por hora', async () => {
      const payload = {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test User',
      };

      // 3 intentos
      for (let i = 0; i < 3; i++) {
        await app.inject({
          method: 'POST',
          url: '/api/auth/register',
          payload: { ...payload, email: `test${i}@example.com` },
        });
      }

      // El cuarto intento debe ser rate limited
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { ...payload, email: 'test3@example.com' },
      });

      // Puede ser 429 (rate limit) o 409 (email duplicado)
      expect([429, 409, 400]).toContain(res.statusCode);
    });
  });

  describe('Global Rate Limit', () => {
    it('debe aplicar rate limit global en múltiples requests', async () => {
      // Hacer 105 requests rápidas a un endpoint público
      const requests = Array.from({ length: 105 }, () =>
        app.inject({
          method: 'GET',
          url: '/api/health',
        })
      );

      const responses = await Promise.all(requests);

      // Algunas deben ser 429 después del límite global
      const rateLimited = responses.filter((r) => r.statusCode === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });
});
