'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { PaymentForm } from '@/components/payment-form';
import { AddressForm } from '@/components/address-form';
import { apiFetch } from '@/lib/csrf';
import { formatPrice } from '@/lib/utils';
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
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-black/10 border-t-black/70" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="glass-card animate-fade-up mb-8 rounded-[22px] px-6 py-5">
        <div className="flex items-center justify-between">
          {['Dirección', 'Resumen', 'Pago'].map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition ${
                  step > i + 1
                    ? 'bg-emerald-500 text-white'
                    : step === i + 1
                      ? 'bg-black/[0.88] text-white'
                      : 'bg-black/[0.06] text-ink-3'
                }`}
              >
                {step > i + 1 ? '✓' : i + 1}
              </div>
              <span
                className={`text-sm font-medium ${
                  step >= i + 1 ? 'text-ink-1' : 'text-ink-4'
                }`}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="animate-fade-in mb-6 rounded-[16px] border border-red-500/20 bg-red-500/[0.08] p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {step === 1 && (
        <div className="animate-fade-up space-y-6">
          <h2 className="text-xl font-semibold tracking-tight text-ink-1">Dirección de envío</h2>

          {addresses.length > 0 && (
            <div className="space-y-3">
              {addresses.map((addr) => (
                <label
                  key={addr.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-[18px] border p-4 transition ${
                    selectedAddressId === addr.id
                      ? 'border-black/30 bg-black/[0.03] shadow-[var(--shadow-sm)]'
                      : 'glass-card hover:bg-white/90'
                  }`}
                >
                  <input
                    type="radio"
                    name="address"
                    value={addr.id}
                    checked={selectedAddressId === addr.id}
                    onChange={() => setSelectedAddressId(addr.id)}
                    className="mt-1 h-4 w-4 accent-[#0071e3]"
                  />
                  <div className="text-sm">
                    <p className="font-medium text-ink-1">{labelDisplay(addr.label)}</p>
                    <p className="text-ink-2">{addr.street}</p>
                    <p className="text-ink-2">
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
              className="w-full rounded-[18px] border-2 border-dashed border-black/15 py-4 text-sm font-medium text-ink-2 transition hover:border-black/25 hover:text-ink-1 disabled:opacity-50"
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
            className="btn-primary w-full py-3"
          >
            {isLoading ? 'Validando…' : 'Continuar al resumen'}
          </button>
        </div>
      )}

      {step === 2 && summary && (
        <div className="animate-fade-up space-y-6">
          <h2 className="text-xl font-semibold tracking-tight text-ink-1">Resumen de la orden</h2>

          <div className="glass-card rounded-[22px] p-6">
            <div className="divide-y divide-[color:var(--hair-soft)]">
              {summary.items.map((item) => (
                <div key={item.productId} className="flex items-center gap-4 py-4">
                  <div className="flex-1">
                    <p className="font-medium text-ink-1">{item.name}</p>
                    <p className="text-sm text-ink-3">
                      {item.quantity} x {formatPrice(item.unitPrice)}
                    </p>
                  </div>
                  <span className="font-medium text-ink-1">
                    {formatPrice(item.unitPrice * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-2.5 border-t border-[color:var(--hair)] pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-2">Subtotal</span>
                <span className="text-ink-1">{formatPrice(summary.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-2">Envío</span>
                <span className="text-ink-1">
                  {summary.shipping === 0 ? 'Gratis' : formatPrice(summary.shipping)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-2">IVA (16%)</span>
                <span className="text-ink-1">{formatPrice(summary.tax)}</span>
              </div>
              <div className="flex justify-between text-lg font-semibold text-ink-1">
                <span>Total</span>
                <span>{formatPrice(summary.total)}</span>
              </div>
            </div>
          </div>

          {summary.priceAlerts.length > 0 && (
            <div className="rounded-[16px] border border-amber-500/20 bg-amber-500/[0.08] p-4">
              <p className="text-sm font-medium text-amber-800">⚠ Algunos precios han cambiado</p>
              <ul className="mt-1 text-sm text-amber-700">
                {summary.priceAlerts.map((alert) => (
                  <li key={alert.productId}>
                    {alert.productName}: {formatPrice(alert.oldPrice)} → {formatPrice(alert.newPrice)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {summary.stockAlerts.length > 0 && (
            <div className="rounded-[16px] border border-amber-500/20 bg-amber-500/[0.08] p-4">
              <p className="text-sm font-medium text-amber-800">📦 Algunos productos sin stock inmediato</p>
              <p className="mt-1 text-xs text-amber-700">Estos productos pueden tardar ~1 semana en llegar.</p>
              <ul className="mt-1 text-sm text-amber-700">
                {summary.stockAlerts.map((alert) => (
                  <li key={alert.productId}>
                    {alert.productName}: disponibles {alert.available}, solicitados {alert.requested}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="btn-secondary px-6 py-3">
              Regresar
            </button>
            <button
              onClick={handleCreatePaymentIntent}
              disabled={isLoading}
              className="btn-primary flex-1 py-3"
            >
              {isLoading ? 'Procesando…' : 'Confirmar y pagar'}
            </button>
          </div>
        </div>
      )}

      {step === 3 && clientSecret && (
        <div className="animate-fade-up space-y-6">
          <h2 className="text-xl font-semibold tracking-tight text-ink-1">Pago seguro</h2>

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
