import Stripe from 'stripe';

/**
 * Servicio de integración con Stripe.
 *
 * Todas las operaciones con Stripe pasan por aquí.
 * NUNCA exponer la secret key en el frontend.
 */

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

/**
 * Crea un PaymentIntent en Stripe.
 */
export async function createStripePaymentIntent(
  amount: number, // En centavos
  currency: string,
  metadata: Record<string, string>
): Promise<{ clientSecret: string; paymentIntentId: string }> {
  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency,
    automatic_payment_methods: { enabled: true },
    metadata,
  });

  if (!paymentIntent.client_secret) {
    throw new Error('STRIPE_ERROR');
  }

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
  };
}

/**
 * Verifica la firma del webhook de Stripe.
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET!;
  return stripe.webhooks.constructEvent(payload, signature, secret);
}

/**
 * Obtiene los detalles de un PaymentIntent.
 */
export async function retrievePaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
  return stripe.paymentIntents.retrieve(paymentIntentId);
}

/**
 * Cancela un PaymentIntent.
 */
export async function cancelPaymentIntent(paymentIntentId: string): Promise<void> {
  await stripe.paymentIntents.cancel(paymentIntentId);
}

export { stripe };
