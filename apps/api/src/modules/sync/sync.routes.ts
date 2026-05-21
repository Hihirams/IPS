import type { FastifyInstance } from 'fastify';
import { prisma } from '../../lib/prisma';
import { SyncService } from '../../services/sync.service';
import { authenticate, requireAdmin } from '../../middleware/auth.middleware';
import { requireMFA, requireAdminSession } from '../../middleware/admin-auth.middleware';
import { CacheService } from '../../services/cache.service';

export async function syncRoutes(app: FastifyInstance) {
  const syncService = new SyncService(app);
  const cache = new CacheService(app);

  // GET /api/admin/sync/status — Estado de la ultima sincronizacion
  app.get(
    '/api/admin/sync/status',
    { preHandler: [authenticate, requireAdmin, requireMFA, requireAdminSession] },
    async (_request, reply) => {
      const status = await syncService.getLatestSyncStatus();

      const stats = {
        categories: {
          total: await prisma.category.count(),
          withSyscomId: await prisma.category.count({ where: { syscomId: { not: null } } }),
        },
        brands: {
          total: await prisma.brand.count(),
          withSyscomId: await prisma.brand.count({ where: { syscomId: { not: null } } }),
        },
        products: {
          total: await prisma.product.count(),
          active: await prisma.product.count({ where: { isActive: true } }),
          withSyscomId: await prisma.product.count({ where: { syscomId: { not: null } } }),
        },
        lastSync: status,
      };

      return reply.status(200).send({ success: true, data: stats });
    }
  );

  // GET /api/admin/sync/logs — Historial de sincronizaciones
  app.get(
    '/api/admin/sync/logs',
    { preHandler: [authenticate, requireAdmin, requireMFA, requireAdminSession] },
    async (request, reply) => {
      const { limit } = request.query as { limit?: string };
      const take = Math.min(100, Math.max(1, Number(limit) || 20));

      const logs = await syncService.getSyncLogs(take);

      return reply.status(200).send({ success: true, data: logs });
    }
  );

  // POST /api/admin/sync/categories — Sincronizar categorias
  app.post(
    '/api/admin/sync/categories',
    { preHandler: [authenticate, requireAdmin, requireMFA, requireAdminSession] },
    async (request, reply) => {
      const syncLog = await prisma.syncLog.create({
        data: {
          entityType: 'CATEGORIES',
          status: 'RUNNING',
          triggeredBy: request.user!.id,
        },
      });

      try {
        const stats = await syncService.syncCategories();

        await prisma.syncLog.update({
          where: { id: syncLog.id },
          data: {
            status: 'COMPLETED',
            recordsProcessed: stats.processed,
            recordsCreated: stats.created,
            recordsUpdated: stats.updated,
            recordsSkipped: stats.skipped,
            errorMessage: stats.errors.length > 0 ? stats.errors.join('\n') : null,
            completedAt: new Date(),
          },
        });

        await cache.invalidate('categories:*');

        return reply.status(200).send({
          success: true,
          data: {
            logId: syncLog.id,
            ...stats,
          },
        });
      } catch (err) {
        await prisma.syncLog.update({
          where: { id: syncLog.id },
          data: {
            status: 'FAILED',
            errorMessage: err instanceof Error ? err.message : String(err),
            completedAt: new Date(),
          },
        });

        return reply.status(500).send({
          success: false,
          error: {
            code: 'SYNC_FAILED',
            message: 'Error sincronizando categorias.',
            details: err instanceof Error ? err.message : String(err),
          },
        });
      }
    }
  );

  // POST /api/admin/sync/brands — Sincronizar marcas
  app.post(
    '/api/admin/sync/brands',
    { preHandler: [authenticate, requireAdmin, requireMFA, requireAdminSession] },
    async (request, reply) => {
      const syncLog = await prisma.syncLog.create({
        data: {
          entityType: 'BRANDS',
          status: 'RUNNING',
          triggeredBy: request.user!.id,
        },
      });

      try {
        const stats = await syncService.syncBrands();

        await prisma.syncLog.update({
          where: { id: syncLog.id },
          data: {
            status: 'COMPLETED',
            recordsProcessed: stats.processed,
            recordsCreated: stats.created,
            recordsUpdated: stats.updated,
            recordsSkipped: stats.skipped,
            errorMessage: stats.errors.length > 0 ? stats.errors.join('\n') : null,
            completedAt: new Date(),
          },
        });

        await cache.invalidate('brands:list');

        return reply.status(200).send({
          success: true,
          data: {
            logId: syncLog.id,
            ...stats,
          },
        });
      } catch (err) {
        await prisma.syncLog.update({
          where: { id: syncLog.id },
          data: {
            status: 'FAILED',
            errorMessage: err instanceof Error ? err.message : String(err),
            completedAt: new Date(),
          },
        });

        return reply.status(500).send({
          success: false,
          error: {
            code: 'SYNC_FAILED',
            message: 'Error sincronizando marcas.',
            details: err instanceof Error ? err.message : String(err),
          },
        });
      }
    }
  );

  // POST /api/admin/sync/products — Sincronizar productos
  app.post(
    '/api/admin/sync/products',
    { preHandler: [authenticate, requireAdmin, requireMFA, requireAdminSession] },
    async (request, reply) => {
      const { categoryId, maxPages } = request.body as {
        categoryId?: string;
        maxPages?: number;
      };

      const syncLog = await prisma.syncLog.create({
        data: {
          entityType: 'PRODUCTS',
          status: 'RUNNING',
          triggeredBy: request.user!.id,
        },
      });

      try {
        const stats = await syncService.syncProducts(categoryId, maxPages);

        await prisma.syncLog.update({
          where: { id: syncLog.id },
          data: {
            status: 'COMPLETED',
            recordsProcessed: stats.processed,
            recordsCreated: stats.created,
            recordsUpdated: stats.updated,
            recordsSkipped: stats.skipped,
            errorMessage: stats.errors.length > 0 ? stats.errors.join('\n') : null,
            completedAt: new Date(),
          },
        });

        await cache.invalidateAllProducts();

        return reply.status(200).send({
          success: true,
          data: {
            logId: syncLog.id,
            ...stats,
          },
        });
      } catch (err) {
        await prisma.syncLog.update({
          where: { id: syncLog.id },
          data: {
            status: 'FAILED',
            errorMessage: err instanceof Error ? err.message : String(err),
            completedAt: new Date(),
          },
        });

        return reply.status(500).send({
          success: false,
          error: {
            code: 'SYNC_FAILED',
            message: 'Error sincronizando productos.',
            details: err instanceof Error ? err.message : String(err),
          },
        });
      }
    }
  );

  // POST /api/admin/sync/products/:syscomId/detail — Sincronizar detalle completo de un producto
  app.post(
    '/api/admin/sync/products/:syscomId/detail',
    { preHandler: [authenticate, requireAdmin, requireMFA, requireAdminSession] },
    async (request, reply) => {
      const { syscomId } = request.params as { syscomId: string };

      try {
        const stats = await syncService.syncFullProductDetail(syscomId);

        return reply.status(200).send({
          success: true,
          data: stats,
        });
      } catch (err) {
        return reply.status(500).send({
          success: false,
          error: {
            code: 'SYNC_FAILED',
            message: 'Error obteniendo detalle del producto.',
            details: err instanceof Error ? err.message : String(err),
          },
        });
      }
    }
  );

  // POST /api/admin/sync/all — Sincronizar todo (categorias, marcas, productos)
  app.post(
    '/api/admin/sync/all',
    { preHandler: [authenticate, requireAdmin, requireMFA, requireAdminSession] },
    async (request, reply) => {
      const userId = request.user!.id;

      // Responder inmediatamente; ejecutar sync en background para evitar timeouts HTTP
      reply.status(202).send({
        success: true,
        data: { message: 'Sincronización iniciada en segundo plano.' },
      });

      // Background sync
      (async () => {
        try {
          const catLog = await prisma.syncLog.create({
            data: { entityType: 'CATEGORIES', status: 'RUNNING', triggeredBy: userId },
          });

          const catStats = await syncService.syncCategories();
          await prisma.syncLog.update({
            where: { id: catLog.id },
            data: {
              status: 'COMPLETED',
              recordsProcessed: catStats.processed,
              recordsCreated: catStats.created,
              recordsUpdated: catStats.updated,
              recordsSkipped: catStats.skipped,
              errorMessage: catStats.errors.length > 0 ? catStats.errors.join('\n') : null,
              completedAt: new Date(),
            },
          });

          const brandLog = await prisma.syncLog.create({
            data: { entityType: 'BRANDS', status: 'RUNNING', triggeredBy: userId },
          });

          const brandStats = await syncService.syncBrands();
          await prisma.syncLog.update({
            where: { id: brandLog.id },
            data: {
              status: 'COMPLETED',
              recordsProcessed: brandStats.processed,
              recordsCreated: brandStats.created,
              recordsUpdated: brandStats.updated,
              recordsSkipped: brandStats.skipped,
              errorMessage: brandStats.errors.length > 0 ? brandStats.errors.join('\n') : null,
              completedAt: new Date(),
            },
          });

          const prodLog = await prisma.syncLog.create({
            data: { entityType: 'PRODUCTS', status: 'RUNNING', triggeredBy: userId },
          });

          const prodStats = await syncService.syncProducts();
          await prisma.syncLog.update({
            where: { id: prodLog.id },
            data: {
              status: 'COMPLETED',
              recordsProcessed: prodStats.processed,
              recordsCreated: prodStats.created,
              recordsUpdated: prodStats.updated,
              recordsSkipped: prodStats.skipped,
              errorMessage: prodStats.errors.length > 0 ? prodStats.errors.join('\n') : null,
              completedAt: new Date(),
            },
          });

          await cache.invalidateAllProducts();

          app.log.info('[sync] Sincronización completa finalizada en segundo plano.');
        } catch (err) {
          app.log.error({ err }, '[sync] Error en sincronización completa en segundo plano.');
        }
      })();
    }
  );
}