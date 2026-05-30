'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { OrderDetail } from '@ecommerce/types';

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

export default function UserOrderDetailPage({ params }: { params: { id: string } }) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewModal, setReviewModal] = useState<string | null>(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: '', body: '' });
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    loadOrder();
  }, [params.id]);

  async function loadOrder() {
    try {
      const res = await fetch(`/api/user/orders/${params.id}`, {
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

  async function submitReview(productId: string) {
    setSubmittingReview(true);

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          productId,
          ...reviewForm,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setReviewModal(null);
        setReviewForm({ rating: 5, title: '', body: '' });
        alert('Reseña enviada exitosamente. Será revisada por un administrador antes de publicarse.');
      } else {
        alert(json.error?.message ?? 'Error al enviar reseña');
      }
    } catch {
      alert('Error de red. Intenta de nuevo.');
    } finally {
      setSubmittingReview(false);
    }
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-black/10 border-t-black/70" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-ink-3">Pedido no encontrado.</p>
      </div>
    );
  }

  const canReview = order.status === 'DELIVERED';

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="animate-fade-up mb-6">
        <Link href="/perfil/pedidos" className="text-sm text-ink-3 transition hover:text-ink-1">
          ← Volver a pedidos
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink-1">Pedido {order.orderNumber}</h1>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Main Content */}
        <div className="animate-fade-up space-y-6 lg:col-span-2">
          {/* Status Timeline */}
          <div className="glass-card rounded-[22px] p-6">
            <h2 className="text-lg font-semibold tracking-tight text-ink-1">Historial</h2>
            <div className="mt-4 space-y-4">
              {order.statusHistory.map((history, index) => (
                <div key={history.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`h-3 w-3 rounded-full ${index === 0 ? 'bg-black/[0.85]' : 'bg-black/20'}`} />
                    {index < order.statusHistory.length - 1 && (
                      <div className="mt-1 h-full w-px bg-black/10" />
                    )}
                  </div>
                  <div className="pb-4">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusColors[history.status] ?? ''}`}>
                      {statusLabels[history.status] ?? history.status}
                    </span>
                    <p className="mt-1 text-sm text-ink-2">{history.notes}</p>
                    <p className="mt-1 text-xs text-ink-4">
                      {new Date(history.createdAt).toLocaleString('es-MX')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Products */}
          <div className="glass-card rounded-[22px] p-6">
            <h2 className="text-lg font-semibold tracking-tight text-ink-1">Productos</h2>
            <div className="mt-4 space-y-4">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-[16px] border border-[color:var(--hair)] p-4"
                >
                  <div>
                    <p className="font-medium text-ink-1">{item.productName}</p>
                    <p className="text-sm text-ink-3">SKU: {item.productSku}</p>
                    <p className="text-sm text-ink-2">
                      {item.quantity} x {formatCurrency(item.unitPrice)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-ink-1">{formatCurrency(item.total)}</p>
                    {canReview && (
                      <button
                        onClick={() => setReviewModal(item.productId)}
                        className="link-accent mt-2 text-sm"
                      >
                        Dejar reseña
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="animate-fade-up delay-1 space-y-6">
          {/* Address */}
          <div className="glass-card rounded-[22px] p-6">
            <h2 className="text-lg font-semibold tracking-tight text-ink-1">Dirección de envío</h2>
            <div className="mt-4 space-y-1 text-sm text-ink-2">
              <p>{order.address.street}</p>
              <p>
                {order.address.city}, {order.address.state}
              </p>
              <p>CP: {order.address.zipCode}</p>
              <p>{order.address.country}</p>
            </div>
          </div>

          {/* Totals */}
          <div className="glass-card rounded-[22px] p-6">
            <h2 className="text-lg font-semibold tracking-tight text-ink-1">Resumen</h2>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-3">Subtotal</span>
                <span className="text-ink-1">{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-3">Envío</span>
                <span className="text-ink-1">{formatCurrency(order.shipping)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-3">IVA</span>
                <span className="text-ink-1">{formatCurrency(order.tax)}</span>
              </div>
              <div className="flex justify-between border-t border-[color:var(--hair)] pt-2 text-lg font-semibold text-ink-1">
                <span>Total</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {reviewModal && (
        <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
          <div className="glass-solid animate-scale-in w-full max-w-md rounded-[24px] p-6">
            <h3 className="text-lg font-semibold tracking-tight text-ink-1">Dejar reseña</h3>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink-2">Calificación</label>
                <div className="mt-1 flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                      className={`text-2xl transition-transform hover:scale-110 ${star <= reviewForm.rating ? 'text-amber-400' : 'text-black/15'}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-2">Título</label>
                <input
                  type="text"
                  value={reviewForm.title}
                  onChange={(e) => setReviewForm({ ...reviewForm, title: e.target.value })}
                  placeholder="Resumen de tu experiencia"
                  className="field mt-1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-2">Reseña</label>
                <textarea
                  value={reviewForm.body}
                  onChange={(e) => setReviewForm({ ...reviewForm, body: e.target.value })}
                  rows={4}
                  maxLength={1000}
                  placeholder="Comparte tu opinión sobre el producto..."
                  className="field mt-1"
                />
                <p className="mt-1 text-xs text-ink-3">{reviewForm.body.length}/1000</p>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setReviewModal(null)}
                className="btn-secondary flex-1 py-2.5"
              >
                Cancelar
              </button>
              <button
                onClick={() => submitReview(reviewModal)}
                disabled={!reviewForm.title || !reviewForm.body || submittingReview}
                className="btn-primary flex-1 py-2.5"
              >
                {submittingReview ? 'Enviando…' : 'Enviar reseña'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
