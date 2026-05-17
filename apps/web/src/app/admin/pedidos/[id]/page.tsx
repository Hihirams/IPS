'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { AdminOrderDetail, OrderStatus } from '@ecommerce/types';

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

const validTransitions: Record<string, string[]> = {
  PENDING: ['CONFIRMED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
};

export default function AdminOrderDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState<OrderStatus | ''>('');
  const [statusNotes, setStatusNotes] = useState('');
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadOrder();
  }, [params.id]);

  async function loadOrder() {
    try {
      const res = await fetch(`/api/admin/orders/${params.id}`, {
        credentials: 'include',
      });
      const json = await res.json();
      if (json.success) {
        setOrder(json.data);
      }
    } catch {
      // Ignorar
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange() {
    if (!newStatus) return;
    setUpdating(true);
    setError('');

    try {
      const res = await fetch(`/api/admin/orders/${params.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus, notes: statusNotes }),
      });
      const json = await res.json();

      if (json.success) {
        setShowStatusModal(false);
        setNewStatus('');
        setStatusNotes('');
        await loadOrder();
      } else {
        setError(json.error?.message ?? 'Error al actualizar estado');
      }
    } catch {
      setError('Error de red. Intenta de nuevo.');
    } finally {
      setUpdating(false);
    }
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-slate-500">Pedido no encontrado.</p>
      </div>
    );
  }

  const availableTransitions = validTransitions[order.status] ?? [];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.push('/admin/pedidos')}
            className="mb-2 text-sm text-slate-500 hover:text-slate-900"
          >
            ← Volver a pedidos
          </button>
          <h1 className="text-2xl font-bold text-slate-900">
            Pedido {order.orderNumber}
          </h1>
        </div>
        {availableTransitions.length > 0 && (
          <button
            onClick={() => setShowStatusModal(true)}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Cambiar estado
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Order Info */}
        <div className="space-y-6 lg:col-span-2">
          {/* Status Timeline */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-900">Historial de estado</h2>
            <div className="mt-4 space-y-4">
              {order.statusHistory.map((history, index) => (
                <div key={history.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`h-3 w-3 rounded-full ${index === 0 ? 'bg-slate-900' : 'bg-slate-300'}`} />
                    {index < order.statusHistory.length - 1 && (
                      <div className="mt-1 h-full w-px bg-slate-200" />
                    )}
                  </div>
                  <div className="pb-4">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusColors[history.status] ?? ''}`}>
                      {statusLabels[history.status] ?? history.status}
                    </span>
                    <p className="mt-1 text-sm text-slate-600">{history.notes}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {new Date(history.createdAt).toLocaleString('es-MX')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Products */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-900">Productos</h2>
            <div className="mt-4 space-y-3">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border border-slate-100 p-4"
                >
                  <div>
                    <p className="font-medium text-slate-900">{item.productName}</p>
                    <p className="text-sm text-slate-500">SKU: {item.productSku}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-600">{item.quantity} x {formatCurrency(item.unitPrice)}</p>
                    <p className="font-medium text-slate-900">{formatCurrency(item.total)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          {/* Customer */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-900">Cliente</h2>
            <div className="mt-4 space-y-2 text-sm">
              <p><span className="text-slate-500">Nombre:</span> {order.user.name ?? 'N/A'}</p>
              <p><span className="text-slate-500">Email:</span> {order.user.email}</p>
              <p><span className="text-slate-500">Teléfono:</span> {order.user.phone ?? 'N/A'}</p>
            </div>
          </div>

          {/* Address */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-900">Dirección de envío</h2>
            <div className="mt-4 space-y-1 text-sm text-slate-600">
              <p>{order.address.street}</p>
              <p>{order.address.city}, {order.address.state}</p>
              <p>CP: {order.address.zipCode}</p>
            </div>
          </div>

          {/* Totals */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-900">Resumen</h2>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Envío</span>
                <span>{formatCurrency(order.shipping)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">IVA</span>
                <span>{formatCurrency(order.tax)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-2 text-lg font-bold">
                <span>Total</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Change Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6">
            <h3 className="text-lg font-bold text-slate-900">Cambiar estado</h3>
            <p className="mt-1 text-sm text-slate-500">
              Estado actual: {statusLabels[order.status]}
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Nuevo estado</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                >
                  <option value="">Seleccionar...</option>
                  {availableTransitions.map((status) => (
                    <option key={status} value={status}>
                      {statusLabels[status]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Notas (opcional)</label>
                <textarea
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                  placeholder="Razón del cambio de estado..."
                />
              </div>

              {(newStatus === 'CANCELLED' || newStatus === 'REFUNDED') && order.paidAt && (
                <div className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-700">
                  ⚠️ Se creará un reembolso automático en Stripe por {formatCurrency(order.total)}.
                </div>
              )}

              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => { setShowStatusModal(false); setError(''); }}
                className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleStatusChange}
                disabled={!newStatus || updating}
                className="flex-1 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {updating ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
