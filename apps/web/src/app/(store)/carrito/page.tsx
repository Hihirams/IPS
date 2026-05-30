'use client';

import Link from 'next/link';
import { useCart } from '@/components/cart-provider';
import { CartItemRow } from '@/components/cart-item-row';
import { formatPrice } from '@/lib/utils';

/**
 * Página del carrito de compras.
 */
export default function CartPage() {
  const { cart, itemCount, isLoading, clearCart } = useCart();

  if (!cart || cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center">
        <div className="glass-card animate-scale-in mx-auto flex h-20 w-20 items-center justify-center rounded-full">
          <svg
            className="h-9 w-9 text-ink-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        </div>
        <h2 className="mt-5 text-xl font-semibold tracking-tight text-ink-1">Tu carrito está vacío</h2>
        <p className="mt-2 text-ink-2">Agrega productos para comenzar tu compra.</p>
        <Link href="/productos" className="btn-primary mt-6 px-6 py-3">
          Explorar productos
        </Link>
      </div>
    );
  }

  const shipping = cart.subtotal >= 1000 ? 0 : 99;
  const tax = Math.round(cart.subtotal * 0.16 * 100) / 100;
  const total = Math.round((cart.subtotal + shipping + tax) * 100) / 100;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="animate-fade-up text-2xl font-semibold tracking-tight text-ink-1">Carrito ({itemCount} items)</h1>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Lista de items */}
        <div className="animate-fade-up lg:col-span-2">
          <div className="glass-card divide-y divide-[color:var(--hair-soft)] rounded-[22px]">
            {cart.items.map((item) => (
              <CartItemRow key={item.id} item={item} />
            ))}
          </div>

          <button
            onClick={clearCart}
            disabled={isLoading}
            className="mt-4 rounded-full px-3 py-1.5 text-sm text-red-500 transition hover:bg-red-500/10 disabled:opacity-50"
          >
            Vaciar carrito
          </button>
        </div>

        {/* Resumen */}
        <div className="animate-fade-up delay-1 space-y-4">
          <div className="glass-panel sticky top-[98px] rounded-[22px] p-6">
            <h2 className="text-lg font-semibold tracking-tight text-ink-1">Resumen</h2>

            <div className="mt-4 space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-2">Subtotal</span>
                <span className="font-medium text-ink-1">{formatPrice(cart.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-2">Envío</span>
                <span className="font-medium text-ink-1">
                  {shipping === 0 ? 'Gratis' : formatPrice(shipping)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-2">IVA (16%)</span>
                <span className="font-medium text-ink-1">{formatPrice(tax)}</span>
              </div>
              <div className="border-t border-[color:var(--hair)] pt-2.5">
                <div className="flex justify-between text-lg font-semibold text-ink-1">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>
            </div>

            {cart.subtotal < 1000 && (
              <p className="mt-3 text-xs text-ink-3">
                Te faltan {formatPrice(1000 - cart.subtotal)} para envío gratis.
              </p>
            )}

            <Link href="/checkout" className="btn-primary mt-6 w-full py-3">
              Proceder al checkout
            </Link>
          </div>

          {/* Alertas */}
          {cart.priceAlerts.length > 0 && (
            <div className="rounded-[18px] border border-amber-500/20 bg-amber-500/[0.08] p-4">
              <p className="text-sm font-medium text-amber-800">⚠ Precios actualizados</p>
              <ul className="mt-1 list-inside list-disc text-sm text-amber-700">
                {cart.priceAlerts.map((alert) => (
                  <li key={alert.productId}>
                    {alert.productName}: {formatPrice(alert.oldPrice)} → {formatPrice(alert.newPrice)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {cart.stockAlerts.length > 0 && (
            <div className="rounded-[18px] border border-amber-500/20 bg-amber-500/[0.08] p-4">
              <p className="text-sm font-medium text-amber-800">📦 Productos con entrega extendida</p>
              <p className="mt-1 text-xs text-amber-600">Estos productos pueden tardar ~1 semana en llegar.</p>
              <ul className="mt-1 list-inside list-disc text-sm text-amber-700">
                {cart.stockAlerts.map((alert) => (
                  <li key={alert.productId}>
                    {alert.productName}: solicitaste {alert.requested}, disponibles {alert.available}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
