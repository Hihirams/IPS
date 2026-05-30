'use client';

import { useState } from 'react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { formatPrice } from '@/lib/utils';

interface PaymentFormProps {
  clientSecret: string;
  total: number;
  returnUrl?: string;
  onSuccess: () => void;
  onError: (message: string) => void;
}

const ERROR_MESSAGES: Record<string, string> = {
  card_declined: 'Tu tarjeta fue rechazada. Intenta con otra tarjeta.',
  insufficient_funds: 'Fondos insuficientes en la tarjeta.',
  expired_card: 'La tarjeta ha expirado.',
  incorrect_cvc: 'El código de seguridad (CVV) es incorrecto.',
  processing_error: 'Ocurrió un error al procesar el pago. Intenta de nuevo.',
  incorrect_number: 'El número de tarjeta es incorrecto.',
  authentication_required: 'Se requiere autenticación adicional (3D Secure).',
};

function translateStripeError(error?: { code?: string; message?: string }): string {
  if (!error) return 'Ocurrió un error desconocido.';
  return ERROR_MESSAGES[error.code ?? ''] || error.message || 'Error al procesar el pago.';
}

/**
 * Formulario de pago con Stripe PaymentElement.
 *
 * Stripe renderiza los campos de tarjeta de forma segura.
 * NUNCA tocamos los datos de la tarjeta directamente.
 */
export function PaymentForm({ total, returnUrl, onSuccess, onError }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url:
          returnUrl ??
          `${window.location.origin}/pedidos/confirmacion`,
      },
    });

    setIsProcessing(false);

    if (error) {
      onError(translateStripeError(error));
    } else {
      // Stripe redirigirá a return_url en caso de éxito
      // Este código solo se ejecuta si no hay redirección (pago instantáneo)
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="glass-card animate-fade-up rounded-[22px] p-6">
        <h3 className="mb-4 text-lg font-semibold tracking-tight text-ink-1">Información de pago</h3>
        <PaymentElement />
      </div>

      <div className="glass-card rounded-[18px] p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-ink-2">Total a pagar</span>
          <span className="text-2xl font-semibold tracking-tight text-ink-1">
            {formatPrice(total)}
          </span>
        </div>
        <p className="mt-2 text-xs text-ink-3">
          Tus datos de pago están protegidos por Stripe. No almacenamos información de tarjetas.
        </p>
      </div>

      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="btn-primary w-full py-3.5"
      >
        {isProcessing ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Procesando pago...
          </span>
        ) : (
          `Pagar ${formatPrice(total)}`
        )}
      </button>
    </form>
  );
}
