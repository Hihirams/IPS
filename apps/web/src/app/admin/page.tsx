'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useAuth } from '@/lib/auth-context';
import type { DashboardMetricsDTO, AdminOrderListItem } from '@ecommerce/types';

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetricsDTO | null>(null);
  const [recentOrders, setRecentOrders] = useState<AdminOrderListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        // Métricas
        const metricsRes = await fetch('/api/admin/dashboard/metrics', {
          credentials: 'include',
        });
        const metricsJson = await metricsRes.json();
        if (metricsJson.success) {
          setMetrics(metricsJson.data);
        }

        // Órdenes recientes (últimas 5)
        const ordersRes = await fetch('/api/admin/orders?page=1&pageSize=5', {
          credentials: 'include',
        });
        const ordersJson = await ordersRes.json();
        if (ordersJson.success) {
          setRecentOrders(ordersJson.data);
        }
      } catch {
        // Ignorar errores
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
      </div>
    );
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);

  const pendingOrders = metrics?.ordersByStatus.find((o) => o.status === 'PENDING')?.count ?? 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-600">
          Bienvenido, {user?.name ?? user?.email}
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Ventas hoy"
          value={formatCurrency(metrics?.salesToday ?? 0)}
          trend="+12%"
        />
        <MetricCard
          title="Ventas del mes"
          value={formatCurrency(metrics?.salesThisMonth ?? 0)}
          trend="+8%"
        />
        <MetricCard
          title="Pedidos pendientes"
          value={pendingOrders.toString()}
          alert={pendingOrders > 0}
        />
        <MetricCard
          title="Stock bajo"
          value={(metrics?.lowStockProducts.length ?? 0).toString()}
          alert={(metrics?.lowStockProducts.length ?? 0) > 0}
        />
      </div>

      {/* Chart + Tables Grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Sales Chart */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">Ventas diarias (últimos 30 días)</h2>
          <div className="mt-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics?.dailySalesLast30Days ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(date: string) => date.slice(5)} // MM-DD
                  stroke="#64748b"
                  fontSize={12}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={12}
                  tickFormatter={(value: number) => `$${value}`}
                />
                <Tooltip
                  formatter={(value: number) => [`$${value.toFixed(2)}`, 'Ventas']}
                  labelFormatter={(label: string) => `Fecha: ${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#0f172a"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Low Stock Products */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">Productos con stock bajo</h2>
          <div className="mt-4 space-y-3">
            {metrics?.lowStockProducts.map((product) => (
              <Link
                key={product.id}
                href={`/admin/productos/${product.id}/editar`}
                className="flex items-center justify-between rounded-lg border border-slate-100 p-3 hover:bg-slate-50"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">{product.name}</p>
                  <p className="text-xs text-slate-500">SKU: {product.sku}</p>
                </div>
                <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700">
                  {product.stock} restantes
                </span>
              </Link>
            ))}
            {(metrics?.lowStockProducts.length ?? 0) === 0 && (
              <p className="text-sm text-slate-500">No hay productos con stock bajo.</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Últimos pedidos</h2>
          <Link
            href="/admin/pedidos"
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            Ver todos →
          </Link>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="pb-3 font-medium">Número</th>
                <th className="pb-3 font-medium">Cliente</th>
                <th className="pb-3 font-medium">Total</th>
                <th className="pb-3 font-medium">Estado</th>
                <th className="pb-3 font-medium">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentOrders.map((order) => (
                <tr key={order.id}>
                  <td className="py-3 font-medium text-slate-900">
                    <Link
                      href={`/admin/pedidos/${order.id}`}
                      className="hover:underline"
                    >
                      {order.orderNumber}
                    </Link>
                  </td>
                  <td className="py-3 text-slate-600">{order.user.email}</td>
                  <td className="py-3 text-slate-900">
                    {formatCurrency(order.total)}
                  </td>
                  <td className="py-3">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="py-3 text-slate-500">
                    {new Date(order.createdAt).toLocaleDateString('es-MX')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  trend,
  alert,
}: {
  title: string;
  value: string;
  trend?: string;
  alert?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-6 ${alert ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white'}`}>
      <p className="text-sm font-medium text-slate-600">{title}</p>
      <p className={`mt-2 text-2xl font-bold ${alert ? 'text-red-700' : 'text-slate-900'}`}>
        {value}
      </p>
      {trend && <p className="mt-1 text-xs text-green-600">{trend}</p>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-700',
    CONFIRMED: 'bg-blue-100 text-blue-700',
    PROCESSING: 'bg-purple-100 text-purple-700',
    SHIPPED: 'bg-indigo-100 text-indigo-700',
    DELIVERED: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-red-100 text-red-700',
    REFUNDED: 'bg-orange-100 text-orange-700',
  };

  const labels: Record<string, string> = {
    PENDING: 'Pendiente',
    CONFIRMED: 'Confirmado',
    PROCESSING: 'Procesando',
    SHIPPED: 'Enviado',
    DELIVERED: 'Entregado',
    CANCELLED: 'Cancelado',
    REFUNDED: 'Reembolsado',
  };

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${colors[status] ?? 'bg-slate-100 text-slate-700'}`}>
      {labels[status] ?? status}
    </span>
  );
}
