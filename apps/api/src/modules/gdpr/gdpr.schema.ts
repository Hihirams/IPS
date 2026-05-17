import { z } from 'zod';

/**
 * Schemas de validación para endpoints GDPR.
 */

export const DeleteAccountSchema = z.object({
  password: z
    .string()
    .min(8, 'La contraseña es obligatoria')
    .max(200, 'Contraseña demasiado larga'),
});

export type DeleteAccountInput = z.infer<typeof DeleteAccountSchema>;
