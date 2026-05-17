'use client';

import Link from 'next/link';
import { useCart } from '@/components/cart-provider';
import { CartItemRow } from '@/components/cart-item-row';

/**
 * Página del carrito de compras.
 */
export default function CartPage() {
  const { cart, itemCount, isLoading, clearCart } = useCart();

  if (!cart || cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center">
        <svg
          className="mx-auto h-16 w-16 text-slate-300"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
        <h2 className="mt-4 text-xl font-semibold text-slate-900">Tu carrito está vacío</h2>
        <p className="mt-2 text-slate-600">Agrega productos para comenzar tu compra.</p>
        <Link
          href="/productos"
          className="mt-6 inline-flex rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Explorar Productos
        </Link>
      </div>
    );
  }

  const shipping = cart.subtotal >= 1000 ? 0 : 99;
  const tax = Math.round(cart.subtotal * 0.16 * 100) / 100;
  const total = Math.round((cart.subtotal + shipping + tax) * 100) / 100;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900">Carrito ({itemCount} items)</h1>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Lista de items */}
        <div className="lg:col-span-2">
          <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
            {cart.items.map((item) => (
              <CartItemRow key={item.id} item={item} />
            ))}
          </div>

          <button
            onClick={clearCart}
            disabled={isLoading}
            className="mt-4 text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
          >
            Vaciar carrito
          </button>
        </div>

        {/* Resumen */}
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-900">Resumen</h2>

            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Subtotal</span>
                <span className="font-medium">${cart.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Envío</span>
                <span className="font-medium">
                  {shipping === 0 ? 'Gratis' : `$${shipping.toLocaleString('es-MX')}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">IVA (16%)</span>
                <span className="font-medium">${tax.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="border-t border-slate-200 pt-2">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span>${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {cart.subtotal < 1000 && (
              <p className="mt-3 text-xs text-slate-500">
                Te faltan ${(1000 - cart.subtotal).toLocaleString('es-MX')} para envío gratis.
              </p>
            )}

            <Link
              href="/checkout"
              className="mt-6 block w-full rounded-lg bg-slate-900 py-3 text-center text-sm font-semibold text-white hover:bg-slate-800"
            >
              Proceder al Checkout
            </Link>
          </div>

          {/* Alertas */}
          {cart.priceAlerts.length > 0 && (
            <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
              <p className="text-sm font-medium text-yellow-800">⚠ Precios actualizados</p>
              <ul className="mt-1 list-inside list-disc text-sm text-yellow-700">
                {cart.priceAlerts.map((alert) => (
                  <li key={alert.productId}>
                    {alert.productName}: ${alert.oldPrice.toLocaleString('es-MX')} → ${alert.newPrice.toLocaleString('es-MX')}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {cart.stockAlerts.length > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-medium text-red-800">⚠ Productos sin stock</p>
              <ul className="mt-1 list-inside list-disc text-sm text-red-700">
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
