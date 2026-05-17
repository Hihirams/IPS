'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

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
    items: Array<{ name: string; quantity: number; unitPrice: number }>;
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
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
        <svg className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h1 className="mt-6 text-3xl font-bold text-slate-900">¡Pedido Confirmado!</h1>
      <p className="mt-2 text-slate-600">
        Gracias por tu compra. Te hemos enviado un correo de confirmación.
      </p>

      {isLoading ? (
        <div className="mt-8 animate-pulse space-y-4">
          <div className="mx-auto h-4 w-1/2 rounded bg-slate-200" />
          <div className="mx-auto h-4 w-1/3 rounded bg-slate-200" />
        </div>
      ) : order ? (
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 text-left">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Número de pedido</p>
              <p className="text-lg font-bold text-slate-900">{order.orderNumber}</p>
            </div>
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
              {order.status}
            </span>
          </div>

          <div className="mt-6 divide-y divide-slate-200">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between py-3 text-sm">
                <span className="text-slate-700">
                  {item.name} x {item.quantity}
                </span>
                <span className="font-medium text-slate-900">
                  ${(item.unitPrice * item.quantity).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 border-t border-slate-200 pt-4">
            <div className="flex justify-between text-lg font-semibold">
              <span>Total pagado</span>
              <span>${order.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      ) : (
        <p className="mt-8 text-slate-500">No se pudo cargar el pedido.</p>
      )}

      <div className="mt-8 flex justify-center gap-4">
        <Link
          href="/productos"
          className="rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Seguir Comprando
        </Link>
        <button className="rounded-lg border border-slate-200 px-6 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Descargar Recibo
        </button>
      </div>
    </div>
  );
}
