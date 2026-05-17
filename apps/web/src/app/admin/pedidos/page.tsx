'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { AdminOrderListItem } from '@ecommerce/types';

type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';

const statusLabels: Record<string, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmado',
  PROCESSING: 'Procesando',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
  REFUNDED: 'Reembolsado',
};

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  PROCESSING: 'bg-purple-100 text-purple-700',
  SHIPPED: 'bg-indigo-100 text-indigo-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  REFUNDED: 'bg-orange-100 text-orange-700',
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadOrders();
  }, [statusFilter, search, page]);

  async function loadOrders() {
    setLoading(true);
    setLoadError('');

    const params = new URLSearchParams();
    params.set('page', page.toString());
    params.set('pageSize', '20');
    if (statusFilter) params.set('status', statusFilter);
    if (search) params.set('search', search);

    try {
      const res = await fetch(`/api/admin/orders?${params}`, {
        credentials: 'include',
      });
      if (res.status === 401) {
        setLoadError('Sesión expirada. Por favor inicia sesión nuevamente.');
        return;
      }
      if (!res.ok) {
        setLoadError('Error al cargar los pedidos. Intenta de nuevo.');
        return;
      }
      const json = await res.json();
      if (json.success) {
        setOrders(json.data);
        setTotalPages(json.meta.totalPages);
      } else {
        setLoadError(json.error?.message ?? 'Error al cargar los pedidos.');
      }
    } catch {
      setLoadError('Error de conexión. Verifica tu red e intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Pedidos</h1>
      </div>

      {/* Error banner */}
      {loadError && (
        <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-700">{loadError}</p>
          <button
            onClick={loadOrders}
            className="rounded-lg bg-red-600 px-3 py-1 text-sm font-medium text-white hover:bg-red-500"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Buscar por número o email..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-slate-900 focus:outline-none"
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as OrderStatus | ''); setPage(1); }}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-slate-900 focus:outline-none"
        >
          <option value="">Todos los estados</option>
          {Object.entries(statusLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-6 py-3 font-medium">Número</th>
                <th className="px-6 py-3 font-medium">Cliente</th>
                <th className="px-6 py-3 font-medium">Total</th>
                <th className="px-6 py-3 font-medium">Estado</th>
                <th className="px-6 py-3 font-medium">Fecha</th>
                <th className="px-6 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    Cargando...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    No se encontraron pedidos.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {order.orderNumber}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <div>{order.user.email}</div>
                      {order.user.name && (
                        <div className="text-xs text-slate-400">{order.user.name}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-900">
                      {formatCurrency(order.total)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusColors[order.status] ?? ''}`}>
                        {statusLabels[order.status] ?? order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(order.createdAt).toLocaleDateString('es-MX')}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/admin/pedidos/${order.id}`}
                        className="text-sm font-medium text-slate-900 hover:underline"
                      >
                        Ver detalle →
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
          >
            ← Anterior
          </button>
          <span className="text-sm text-slate-500">Página {page} de {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
          >
            Siguiente →
          </button>
        </div>
      </div>
    </div>
  );
}
