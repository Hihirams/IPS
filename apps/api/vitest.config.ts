import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * Configuración de Vitest para tests de seguridad del API.
 *
 * Incluye:
 * - Coverage con umbral mínimo del 70%
 * - Setup global para inicializar mocks
 * - Timeout extendido para tests de integración
 */

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/tests/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    setupFiles: ['./src/tests/helpers/test-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70,
      },
      exclude: [
        'node_modules/',
        'src/tests/',
        'src/**/*.routes.ts',
        'src/plugins/',
        'src/index.ts',
      ],
    },
    // Timeout para tests de integración (10s)
    testTimeout: 10000,
    // Timeout para hooks (15s)
    hookTimeout: 15000,
  },
  resolve: {
    alias: {
      '@ecommerce/types': path.resolve(__dirname, '../../packages/types/src'),
      '@ecommerce/config': path.resolve(__dirname, '../../packages/config/src'),
    },
  },
});
