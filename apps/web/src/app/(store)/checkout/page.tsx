'use client';

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { PaymentForm } from '@/components/payment-form';
import { AddressForm } from '@/components/address-form';
import type { CheckoutSummary } from '@ecommerce/types';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

/**
 * Checkout de 3 pasos:
 * 1. Dirección
 * 2. Resumen de orden
 * 3. Pago con Stripe
 */
export default function CheckoutPage() {
  const [step, setStep] = useState(1);
  const [addresses, setAddresses] = useState<Array<Record<string, unknown>>>([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [summary, setSummary] = useState<CheckoutSummary | null>(null);
  const [clientSecret, setClientSecret] = useState('');
  const [orderId, setOrderId] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Cargar direcciones del usuario
  useEffect(() => {
    const fetchAddresses = async () => {
      const res = await fetch('/api/auth/me', {
        credentials: 'include',
      });
      // En un endpoint real, obtendríamos las direcciones del usuario
      // Por ahora usamos datos de ejemplo
      setAddresses([]);
    };
    fetchAddresses();
  }, []);

  // Validar carrito
  const handleValidateCart = async () => {
    if (!selectedAddressId) {
      setError('Selecciona una dirección de envío');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/checkout/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      const json = await res.json();

      if (json.success) {
        setSummary(json.data);
        setStep(2);
      } else {
        setError(json.error?.message ?? 'Error al validar el carrito');
      }
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  // Crear PaymentIntent
  const handleCreatePaymentIntent = async () => {
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/checkout/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          addressId: selectedAddressId,
          shippingMethod: 'standard',
        }),
      });
      const json = await res.json();

      if (json.success) {
        setClientSecret(json.data.clientSecret);
        setOrderId(json.data.orderId);
        setStep(3);
      } else {
        setError(json.error?.message ?? 'Error al iniciar el pago');
      }
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddressSubmit = (address: Record<string, unknown>) => {
    // En una implementación real, enviaría la dirección al backend
    // y recibiría un addressId
    const newAddress = { id: `addr_${Date.now()}`, ...address };
    setAddresses([...addresses, newAddress]);
    setSelectedAddressId(newAddress.id as string);
    setShowNewAddressForm(false);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Progress steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {['Dirección', 'Resumen', 'Pago'].map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                  step > i + 1
                    ? 'bg-green-600 text-white'
                    : step === i + 1
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-200 text-slate-600'
                }`}
              >
                {step > i + 1 ? '✓' : i + 1}
              </div>
              <span
                className={`text-sm font-medium ${
                  step >= i + 1 ? 'text-slate-900' : 'text-slate-400'
                }`}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Paso 1: Dirección */}
      {step === 1 && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-900">Dirección de Envío</h2>

          {addresses.length > 0 && (
            <div className="space-y-3">
              {addresses.map((addr) => (
                <label
                  key={addr.id as string}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${
                    selectedAddressId === addr.id
                      ? 'border-slate-900 bg-slate-50'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="address"
                    value={addr.id as string}
                    checked={selectedAddressId === addr.id}
                    onChange={() => setSelectedAddressId(addr.id as string)}
                    className="mt-1"
                  />
                  <div className="text-sm">
                    <p className="font-medium text-slate-900">{addr.label as string}</p>
                    <p className="text-slate-600">{addr.street as string}</p>
                    <p className="text-slate-600">
                      {addr.city as string}, {addr.state as string} {addr.zipCode as string}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          )}

          {!showNewAddressForm ? (
            <button
              onClick={() => setShowNewAddressForm(true)}
              className="w-full rounded-lg border-2 border-dashed border-slate-300 py-4 text-sm font-medium text-slate-600 hover:border-slate-400 hover:text-slate-900"
            >
              + Agregar nueva dirección
            </button>
          ) : (
            <AddressForm
              onSubmit={handleAddressSubmit}
              onCancel={() => setShowNewAddressForm(false)}
            />
          )}

          <button
            onClick={handleValidateCart}
            disabled={isLoading || !selectedAddressId}
            className="w-full rounded-lg bg-slate-900 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {isLoading ? 'Validando...' : 'Continuar al Resumen'}
          </button>
        </div>
      )}

      {/* Paso 2: Resumen */}
      {step === 2 && summary && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-900">Resumen de la Orden</h2>

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="divide-y divide-slate-200">
              {summary.items.map((item) => (
                <div key={item.productId} className="flex items-center gap-4 py-4">
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{item.name}</p>
                    <p className="text-sm text-slate-500">
                      {item.quantity} x ${item.unitPrice.toLocaleString('es-MX')}
                    </p>
                  </div>
                  <span className="font-medium text-slate-900">
                    ${(item.unitPrice * item.quantity).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-2 border-t border-slate-200 pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Subtotal</span>
                <span>${summary.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Envío</span>
                <span>
                  {summary.shipping === 0 ? 'Gratis' : `$${summary.shipping.toLocaleString('es-MX')}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">IVA (16%)</span>
                <span>${summary.tax.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-lg font-semibold">
                <span>Total</span>
                <span>${summary.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Alertas */}
          {summary.priceAlerts.length > 0 && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <p className="text-sm font-medium text-yellow-800">⚠ Algunos precios han cambiado</p>
              <ul className="mt-1 text-sm text-yellow-700">
                {summary.priceAlerts.map((alert) => (
                  <li key={alert.productId}>
                    {alert.productName}: ${alert.oldPrice.toLocaleString('es-MX')} → ${alert.newPrice.toLocaleString('es-MX')}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {summary.stockAlerts.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-medium text-red-800">⚠ Productos sin stock suficiente</p>
              <ul className="mt-1 text-sm text-red-700">
                {summary.stockAlerts.map((alert) => (
                  <li key={alert.productId}>
                    {alert.productName}: disponibles {alert.available}, solicitados {alert.requested}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="rounded-lg border border-slate-200 px-6 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Regresar
            </button>
            <button
              onClick={handleCreatePaymentIntent}
              disabled={isLoading || summary.stockAlerts.length > 0}
              className="flex-1 rounded-lg bg-slate-900 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {isLoading ? 'Procesando...' : 'Confirmar y Pagar'}
            </button>
          </div>
        </div>
      )}

      {/* Paso 3: Pago */}
      {step === 3 && clientSecret && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-900">Pago Seguro</h2>

          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <PaymentForm
              clientSecret={clientSecret}
              total={summary?.total ?? 0}
              onSuccess={() => {
                window.location.href = `/pedidos/${orderId}/confirmacion`;
              }}
              onError={(msg) => setError(msg)}
            />
          </Elements>
        </div>
      )}
    </div>
  );
}
