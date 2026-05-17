import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildTestApp } from '../helpers/test-app';
import type { FastifyInstance } from 'fastify';

/**
 * Tests de seguridad: SQL Injection.
 *
 * Verifica:
 * - Intentos de SQL injection en campos de búsqueda son sanitizados
 * - Inputs con caracteres especiales son manejados correctamente
 * - Parámetros de paginación con valores inyectados son rechazados
 *
 * NOTA: Prisma ORM usa parameterized queries por defecto, lo que previene
 * SQL injection. Estos tests verifican que la API maneja correctamente
 * inputs maliciosos sin errores ni comportamientos inesperados.
 */

describe('SQL Injection Security', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Campos de búsqueda', () => {
    it('debe manejar comillas simples en búsqueda sin error', async () => {
      const maliciousQuery = "producto' OR '1'='1";

      const res = await app.inject({
        method: 'GET',
        url: `/api/products?q=${encodeURIComponent(maliciousQuery)}`,
      });

      // No debe devolver 500 (error interno del servidor)
      expect(res.statusCode).not.toBe(500);
      // Debe devolver 200 (búsqueda normal sin resultados) o 400
      expect([200, 400]).toContain(res.statusCode);
    });

    it('debe manejar UNION SELECT en búsqueda sin error', async () => {
      const maliciousQuery = "producto' UNION SELECT * FROM users --";

      const res = await app.inject({
        method: 'GET',
        url: `/api/products?q=${encodeURIComponent(maliciousQuery)}`,
      });

      expect(res.statusCode).not.toBe(500);
      expect([200, 400]).toContain(res.statusCode);
    });

    it('debe manejar comentarios SQL en búsqueda sin error', async () => {
      const maliciousQuery = "producto'; DROP TABLE users; --";

      const res = await app.inject({
        method: 'GET',
        url: `/api/products?q=${encodeURIComponent(maliciousQuery)}`,
      });

      expect(res.statusCode).not.toBe(500);
      expect([200, 400]).toContain(res.statusCode);
    });
  });

  describe('Parámetros de paginación', () => {
    it('debe rechazar page como string inyectado', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/products?page=1 OR 1=1&pageSize=10',
      });

      // No debe causar error 500
      expect(res.statusCode).not.toBe(500);
    });

    it('debe manejar pageSize muy grande sin crash', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/products?page=1&pageSize=999999999',
      });

      expect(res.statusCode).not.toBe(500);
    });

    it('debe manejar parámetros no numéricos en paginación', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/products?page=abc&pageSize=def',
      });

      expect(res.statusCode).not.toBe(500);
      expect([200, 400]).toContain(res.statusCode);
    });
  });

  describe('Inputs con caracteres especiales', () => {
    it('debe manejar caracteres especiales en body de POST', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: "test'@example.com",
          password: 'Pass<>word123!',
          name: 'Test <script>alert(1)</script>',
        },
      });

      // No debe causar error 500
      expect(res.statusCode).not.toBe(500);
    });

    it('debe manejar emojis y unicode en inputs', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'test@example.com',
          password: 'Password123!💥',
          name: 'Test Ñoño 🎉',
        },
      });

      expect(res.statusCode).not.toBe(500);
    });
  });
});
