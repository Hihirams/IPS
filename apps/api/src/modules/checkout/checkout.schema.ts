import { z } from 'zod';

/**
 * Esquemas Zod para checkout.
 */

export const CreatePaymentIntentSchema = z.object({
  addressId: z.string().min(1, 'La dirección es obligatoria'),
  shippingMethod: z.enum(['standard', 'express']).default('standard'),
  notes: z.string().max(1000).optional(),
});

export type CreatePaymentIntentInput = z.infer<typeof CreatePaymentIntentSchema>;
