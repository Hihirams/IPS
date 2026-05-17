import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../middleware/auth.middleware';
import { DeleteAccountSchema } from './gdpr.schema';
import type { DeleteAccountInput } from './gdpr.schema';
import { exportUserData, deleteUserAccount } from './gdpr.service';

/**
 * Rutas GDPR:
 * - GET /api/user/export-data  → Exportar todos los datos del usuario (JSON)
 * - DELETE /api/user/delete-account → Eliminar cuenta (soft delete + anonimización)
 *
 * Rate limits:
 * - Export: 1 por semana por usuario (Redis key: `export:{userId}`)
 * - Delete: 3 por día por usuario
 */

const ONE_WEEK_SECONDS = 7 * 24 * 60 * 60;
const ONE_DAY_SECONDS = 24 * 60 * 60;

export async function gdprRoutes(app: FastifyInstance) {
  // ==========================================
  // GET /api/user/export-data
  // ==========================================
  app.get(
    '/api/user/export-data',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const userId = (request.user as { id: string }).id;
      const exportKey = `gdpr_export:${userId}`;

      // Rate limit: 1 exportación por semana
      const lastExport = await app.redis.get(exportKey);
      if (lastExport) {
        return reply.status(429).send({
          success: false,
          error: {
            code: 'EXPORT_RATE_LIMIT',
            message: 'Solo puedes exportar tus datos una vez por semana.',
          },
        });
      }

      try {
        const data = await exportUserData(userId);

        // Marcar exportación en Redis (1 semana TTL)
        await app.redis.setex(exportKey, ONE_WEEK_SECONDS, Date.now().toString());

        // Loggear exportación (auditoría GDPR)
        app.log.info({ userId, action: 'GDPR_EXPORT' }, 'Usuario exportó sus datos (GDPR)');

        return reply.status(200).send({
          success: true,
          data,
        });
      } catch (err) {
        app.log.error({ err, userId }, 'Error al exportar datos de usuario');
        return reply.status(500).send({
          success: false,
          error: {
            code: 'EXPORT_ERROR',
            message: 'Error al exportar datos. Intenta más tarde.',
          },
        });
      }
    }
  );

  // ==========================================
  // DELETE /api/user/delete-account
  // ==========================================
  app.delete(
    '/api/user/delete-account',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const userId = (request.user as { id: string }).id;
      const deleteKey = `gdpr_delete:${userId}`;

      // Rate limit: 3 eliminaciones por día
      const deleteCount = parseInt((await app.redis.get(deleteKey)) ?? '0', 10);
      if (deleteCount >= 3) {
        return reply.status(429).send({
          success: false,
          error: {
            code: 'DELETE_RATE_LIMIT',
            message: 'Límite de solicitudes de eliminación alcanzado. Intenta mañana.',
          },
        });
      }

      // Validar input (password obligatoria)
      const data = request.validate(DeleteAccountSchema, 'body') as DeleteAccountInput;

      try {
        await deleteUserAccount(app, userId, data.password);

        // Incrementar contador de eliminaciones
        await app.redis.incr(deleteKey);
        await app.redis.expire(deleteKey, ONE_DAY_SECONDS);

        // Loggear eliminación (auditoría GDPR)
        app.log.warn({ userId, action: 'GDPR_DELETE' }, 'Usuario eliminó su cuenta (GDPR)');

        return reply.status(200).send({
          success: true,
          data: {
            message: 'Tu cuenta ha sido eliminada exitosamente.',
          },
        });
      } catch (err) {
        if (err instanceof Error && err.message === 'INVALID_PASSWORD') {
          return reply.status(401).send({
            success: false,
            error: {
              code: 'INVALID_PASSWORD',
              message: 'La contraseña es incorrecta.',
            },
          });
        }

        app.log.error({ err, userId }, 'Error al eliminar cuenta de usuario');
        return reply.status(500).send({
          success: false,
          error: {
            code: 'DELETE_ERROR',
            message: 'Error al eliminar cuenta. Intenta más tarde.',
          },
        });
      }
    }
  );
}
