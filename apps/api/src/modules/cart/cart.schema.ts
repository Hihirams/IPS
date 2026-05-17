import { z } from 'zod';

/**
 * Esquemas Zod para el carrito.
 */

export const AddToCartSchema = z.object({
  productId: z.string().min(1, 'ProductId es obligatorio'),
  quantity: z
    .number()
    .int('La cantidad debe ser un número entero')
    .min(1, 'Mínimo 1 unidad')
    .max(99, 'Máximo 99 unidades por producto'),
});

export type AddToCartInput = z.infer<typeof AddToCartSchema>;

export const UpdateCartItemSchema = z.object({
  quantity: z
    .number()
    .int()
    .min(0, 'La cantidad no puede ser negativa')
    .max(99, 'Máximo 99 unidades'),
});

export type UpdateCartItemInput = z.infer<typeof UpdateCartItemSchema>;

export const MergeCartSchema = z.object({
  sessionId: z.string().min(1, 'SessionId es obligatorio'),
});

export type MergeCartInput = z.infer<typeof MergeCartSchema>;
