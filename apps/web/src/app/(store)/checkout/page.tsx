'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { PaymentForm } from '@/components/payment-form';
import { AddressForm } from '@/components/address-form';
import { apiFetch } from '@/lib/csrf';
import type { Address, CheckoutSummary } from '@ecommerce/types';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

/**
 * Checkout de 3 pasos:
 * 1. Dirección
 * 2. Resumen de orden
 * 3. Pago con Stripe
 */
export default function CheckoutPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [summary, setSummary] = useState<CheckoutSummary | null>(null);
  const [clientSecret, setClientSecret] = useState('');
  const [orderId, setOrderId] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [addressesLoading, setAddressesLoading] = useState(true);

  const loadAddresses = useCallback(async () => {
    setAddressesLoading(true);
    setError('');

    try {
      const res = await fetch('/api/user/addresses', { credentials: 'include' });

      if (res.status === 401) {
        router.push('/login?redirect=/checkout');
        return;
      }

      const json = await res.json();
      if (json.success) {
        const list = json.data as Address[];
        setAddresses(list);
        const defaultAddr = list.find((a) => a.isDefault) ?? list[0];
        if (defaultAddr) {
          setSelectedAddressId(defaultAddr.id);
        }
      }
    } catch {
      setError('No se pudieron cargar tus direcciones.');
    } finally {
      setAddressesLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  const handleValidateCart = async () => {
    if (!selectedAddressId) {
      setError('Selecciona una dirección de envío');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await apiFetch('/api/checkout/validate', { method: 'POST' });
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

  const handleCreatePaymentIntent = async () => {
    setIsLoading(true);
    setError('');

    try {
      const res = await apiFetch('/api/checkout/create-payment-intent', {
        method: 'POST',
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

  const handleAddressSubmit = async (address: {
    label: Address['label'];
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    isDefault: boolean;
  }) => {
    setIsLoading(true);
    setError('');

    try {
      const res = await apiFetch('/api/user/addresses', {
        method: 'POST',
        body: JSON.stringify(address),
      });
      const json = await res.json();

      if (json.success) {
        const created = json.data as Address;
        await loadAddresses();
        setSelectedAddressId(created.id);
        setShowNewAddressForm(false);
      } else {
        setError(json.error?.message ?? 'Error al guardar la dirección');
      }
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const labelDisplay = (label: Address['label']) => {
    if (label === 'HOME') return 'Casa';
    if (label === 'OFFICE') return 'Oficina';
    return 'Otra';
  };

  if (addressesLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
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

      {step === 1 && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-900">Dirección de Envío</h2>

          {addresses.length > 0 && (
            <div className="space-y-3">
              {addresses.map((addr) => (
                <label
                  key={addr.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${
                    selectedAddressId === addr.id
                      ? 'border-slate-900 bg-slate-50'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="address"
                    value={addr.id}
                    checked={selectedAddressId === addr.id}
                    onChange={() => setSelectedAddressId(addr.id)}
                    className="mt-1"
                  />
                  <div className="text-sm">
                    <p className="font-medium text-slate-900">{labelDisplay(addr.label)}</p>
                    <p className="text-slate-600">{addr.street}</p>
                    <p className="text-slate-600">
                      {addr.city}, {addr.state} {addr.zipCode}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          )}

          {!showNewAddressForm ? (
            <button
              onClick={() => setShowNewAddressForm(true)}
              disabled={addresses.length >= 5}
              className="w-full rounded-lg border-2 border-dashed border-slate-300 py-4 text-sm font-medium text-slate-600 hover:border-slate-400 hover:text-slate-900 disabled:opacity-50"
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

      {step === 3 && clientSecret && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-900">Pago Seguro</h2>

          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <PaymentForm
              clientSecret={clientSecret}
              total={summary?.total ?? 0}
              returnUrl={`${typeof window !== 'undefined' ? window.location.origin : ''}/pedidos/${orderId}/confirmacion`}
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
