'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { formatPrice } from '@/lib/utils';

/**
 * Página de confirmación de pedido.
 *
 * Muestra el resumen de la compra confirmada.
 */
export default function OrderConfirmationPage() {
  const params = useParams();
  const orderId = params.orderId as string;
  const [order, setOrder] = useState<{
    orderNumber: string;
    total: number;
    status: string;
    items: Array<{ productName: string; quantity: number; unitPrice: number }>;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}`, {
          credentials: 'include',
        });
        const json = await res.json();
        if (json.success) {
          setOrder(json.data);
        }
      } catch {
        // Error silencioso
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      {/* Checkmark */}
      <div className="animate-pop-in mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/25">
        <svg className="h-10 w-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h1 className="animate-fade-up delay-1 mt-6 text-3xl font-semibold tracking-tight text-ink-1">¡Pedido confirmado!</h1>
      <p className="animate-fade-up delay-2 mt-2 text-ink-2">
        Gracias por tu compra. Te hemos enviado un correo de confirmación.
      </p>

      {isLoading ? (
        <div className="mt-8 space-y-4">
          <div className="shimmer mx-auto h-4 w-1/2 rounded-full" />
          <div className="shimmer mx-auto h-4 w-1/3 rounded-full" />
        </div>
      ) : order ? (
        <div className="glass-card animate-fade-up delay-3 mt-8 rounded-[22px] p-6 text-left">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-ink-3">Número de pedido</p>
              <p className="text-lg font-semibold text-ink-1">{order.orderNumber}</p>
            </div>
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700">
              {order.status}
            </span>
          </div>

          <div className="mt-6 divide-y divide-[color:var(--hair-soft)]">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between py-3 text-sm">
                <span className="text-ink-2">
                  {item.productName} x {item.quantity}
                </span>
                <span className="font-medium text-ink-1">
                  {formatPrice(item.unitPrice * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 border-t border-[color:var(--hair)] pt-4">
            <div className="flex justify-between text-lg font-semibold text-ink-1">
              <span>Total pagado</span>
              <span>{formatPrice(order.total)}</span>
            </div>
          </div>
        </div>
      ) : (
        <p className="mt-8 text-ink-3">No se pudo cargar el pedido.</p>
      )}

      <div className="mt-8 flex justify-center gap-3">
        <Link href="/productos" className="btn-primary px-6 py-3">
          Seguir comprando
        </Link>
        <button className="btn-secondary px-6 py-3">
          Descargar recibo
        </button>
      </div>
    </div>
  );
}
