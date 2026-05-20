import { PrismaClient } from '@prisma/client';

type PrismaClientWithOmit = PrismaClient<{
  omit: {
    user: {
      passwordHash: true;
    };
  };
}>;

/**
 * Prisma Client con configuración de seguridad.
 *
 * - Omite `passwordHash` de TODAS las queries de User por defecto.
 * - Soft delete: filtra usuarios con deletedAt no nulo.
 *
 * Uso: importar desde cualquier lugar del backend en lugar de @prisma/client directamente.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientWithOmit | undefined;
};

export const prisma = globalForPrisma.prisma ??
  new PrismaClient({
    omit: {
      user: {
        passwordHash: true,
      },
    },
  }) as PrismaClientWithOmit;

// En desarrollo, preservar la instancia para evitar múltiples conexiones (hot reload)
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Middleware de Prisma para implementar soft delete automático en User.
 * Filtra registros donde deletedAt no es null en todas las operaciones de lectura.
 */
prisma.$use(async (params, next) => {
  if (params.model === 'User') {
    if (params.action === 'findUnique' || params.action === 'findFirst') {
      params.args.where = { ...params.args.where, deletedAt: null };
    }
    if (params.action === 'findMany') {
      if (!params.args.where) {
        params.args.where = {};
      }
      if (params.args.where.deletedAt === undefined) {
        params.args.where.deletedAt = null;
      }
    }
    if (params.action === 'count') {
      if (!params.args.where) {
        params.args.where = {};
      }
      if (params.args.where.deletedAt === undefined) {
        params.args.where.deletedAt = null;
      }
    }
  }
  return next(params);
});
