'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Order } from '@ecommerce/types';

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
  PENDING: 'bg-amber-500/10 text-amber-700',
  CONFIRMED: 'bg-blue-500/10 text-blue-700',
  PROCESSING: 'bg-violet-500/10 text-violet-700',
  SHIPPED: 'bg-indigo-500/10 text-indigo-700',
  DELIVERED: 'bg-emerald-500/10 text-emerald-700',
  CANCELLED: 'bg-red-500/10 text-red-700',
  REFUNDED: 'bg-orange-500/10 text-orange-700',
};

export default function UserOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadOrders();
  }, [page]);

  async function loadOrders() {
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/user/orders?page=${page}&pageSize=10`, {
        credentials: 'include',
      });
      if (res.status === 401) {
        setError('Debes iniciar sesión para ver tus pedidos.');
        return;
      }
      const json = await res.json();
      if (json.success) {
        setOrders(json.data);
        setTotalPages(json.meta.totalPages);
      } else {
        setError(json.error?.message ?? 'Error al cargar pedidos.');
      }
    } catch {
      setError('Error de red. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="animate-fade-up mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-ink-1">Mis pedidos</h1>
        <Link href="/perfil" className="text-sm text-ink-3 transition hover:text-ink-1">
          ← Volver al perfil
        </Link>
      </div>

      <div className="glass-card animate-fade-up overflow-hidden rounded-[22px]">
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-black/10 border-t-black/70" />
          </div>
        ) : error ? (
          <div className="py-16 text-center">
            <p className="text-red-500">{error}</p>
            <button onClick={loadOrders} className="btn-primary mt-4 px-5 py-2.5">
              Reintentar
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-ink-3">No tienes pedidos aún.</p>
            <Link href="/productos" className="btn-primary mt-4 px-5 py-2.5">
              Explorar productos
            </Link>
          </div>
        ) : (
          <>
            <div className="divide-y divide-[color:var(--hair-soft)]">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between px-6 py-4 transition hover:bg-black/[0.03]"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/perfil/pedidos/${order.id}`}
                        className="font-medium text-ink-1 hover:underline"
                      >
                        {order.orderNumber}
                      </Link>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusColors[order.status] ?? ''}`}
                      >
                        {statusLabels[order.status] ?? order.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-ink-3">
                      {new Date(order.createdAt).toLocaleDateString('es-MX')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-ink-1">
                      {formatCurrency(Number(order.total))}
                    </p>
                    <Link
                      href={`/perfil/pedidos/${order.id}`}
                      className="mt-1 text-sm text-ink-2 transition hover:text-ink-1"
                    >
                      Ver detalle →
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t border-[color:var(--hair)] px-6 py-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-full px-4 py-2 text-sm text-ink-2 transition hover:bg-black/[0.05] disabled:opacity-50"
              >
                ← Anterior
              </button>
              <span className="text-sm text-ink-3">
                Página {page} de {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-full px-4 py-2 text-sm text-ink-2 transition hover:bg-black/[0.05] disabled:opacity-50"
              >
                Siguiente →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
