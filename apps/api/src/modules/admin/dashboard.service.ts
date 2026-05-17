import { prisma } from '../../lib/prisma';
import type { FastifyInstance } from 'fastify';
import { CacheService } from '../../services/cache.service';

/**
 * Servicio de métricas del dashboard de administración.
 * Todas las métricas se cachean en Redis por 5 minutos.
 */

const CACHE_KEY = 'admin:dashboard:metrics';
const CACHE_TTL = 5 * 60; // 5 minutos

export interface DashboardMetrics {
  salesToday: number;
  salesThisWeek: number;
  salesThisMonth: number;
  ordersByStatus: Array<{ status: string; count: number }>;
  lowStockProducts: Array<{
    id: string;
    name: string;
    sku: string;
    stock: number;
    lowStockThreshold: number;
    price: number;
  }>;
  newUsersThisWeek: number;
  dailySalesLast30Days: Array<{ date: string; total: number }>;
  topProducts: Array<{
    productId: string;
    productName: string;
    totalSold: number;
    revenue: number;
  }>;
}

/**
 * Obtiene las métricas del dashboard, con cache en Redis.
 */
export async function getDashboardMetrics(app: FastifyInstance): Promise<DashboardMetrics> {
  const cache = new CacheService(app);

  // Intentar leer del cache
  const cached = await cache.get<DashboardMetrics>(CACHE_KEY);
  if (cached) {
    return cached;
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  // 1. Ventas (órdenes DELIVERED)
  const salesToday = await getSalesSum(todayStart);
  const salesThisWeek = await getSalesSum(weekStart);
  const salesThisMonth = await getSalesSum(monthStart);

  // 2. Órdenes por status
  const ordersByStatus = await prisma.order.groupBy({
    by: ['status'],
    _count: { id: true },
  });

  // 3. Productos con stock bajo
  const lowStockProducts = await prisma.product.findMany({
    where: {
      stock: { lt: prisma.product.fields.lowStockThreshold },
      isActive: true,
    },
    orderBy: { stock: 'asc' },
    take: 10,
    select: {
      id: true,
      name: true,
      sku: true,
      stock: true,
      lowStockThreshold: true,
      price: true,
    },
  });

  // 4. Nuevos usuarios (últimos 7 días)
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);

  const newUsersThisWeek = await prisma.user.count({
    where: {
      createdAt: { gte: sevenDaysAgo },
      deletedAt: null,
    },
  });

  // 5. Ventas diarias últimos 30 días
  const dailySales = await prisma.order.findMany({
    where: {
      status: 'DELIVERED',
      paidAt: { gte: thirtyDaysAgo },
    },
    select: {
      total: true,
      paidAt: true,
    },
  });

  const dailySalesMap = new Map<string, number>();
  for (const order of dailySales) {
    if (!order.paidAt) continue;
    const dateKey = order.paidAt.toISOString().split('T')[0];
    const current = dailySalesMap.get(dateKey) ?? 0;
    dailySalesMap.set(dateKey, current + Number(order.total));
  }

  // Rellenar días sin ventas
  const dailySalesLast30Days: Array<{ date: string; total: number }> = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo);
    d.setDate(d.getDate() + i);
    const dateKey = d.toISOString().split('T')[0];
    dailySalesLast30Days.push({
      date: dateKey,
      total: dailySalesMap.get(dateKey) ?? 0,
    });
  }

  // 6. Top 5 productos más vendidos
  const topProductsRaw = await prisma.orderItem.groupBy({
    by: ['productId'],
    where: {
      order: {
        status: 'DELIVERED',
      },
    },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: 'desc' } },
    take: 5,
  });

  const topProducts = await Promise.all(
    topProductsRaw.map(async (item) => {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        select: { name: true, price: true },
      });
      return {
        productId: item.productId,
        productName: product?.name ?? 'Producto desconocido',
        totalSold: item._sum.quantity ?? 0,
        revenue: Number(product?.price ?? 0) * (item._sum.quantity ?? 0),
      };
    })
  );

  const metrics: DashboardMetrics = {
    salesToday,
    salesThisWeek,
    salesThisMonth,
    ordersByStatus: ordersByStatus.map((o) => ({
      status: o.status,
      count: o._count.id,
    })),
    lowStockProducts: lowStockProducts.map((p) => ({
      ...p,
      price: Number(p.price),
    })),
    newUsersThisWeek,
    dailySalesLast30Days,
    topProducts,
  };

  // Guardar en cache
  await cache.set(CACHE_KEY, metrics, CACHE_TTL);

  return metrics;
}

/**
 * Helper: suma de ventas (órdenes DELIVERED) desde una fecha.
 */
async function getSalesSum(fromDate: Date): Promise<number> {
  const result = await prisma.order.aggregate({
    where: {
      status: 'DELIVERED',
      paidAt: { gte: fromDate },
    },
    _sum: { total: true },
  });

  return Number(result._sum.total ?? 0);
}

/**
 * Invalida el cache del dashboard.
 */
export async function invalidateDashboardCache(app: FastifyInstance): Promise<void> {
  const cache = new CacheService(app);
  await cache.invalidate(CACHE_KEY);
}
