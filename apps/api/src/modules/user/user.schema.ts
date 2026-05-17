import { z } from 'zod';

/**
 * Esquemas Zod para endpoints de usuario/perfil.
 */

// ==========================================
// Profile
// ==========================================

export const UpdateProfileSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  phone: z.string().max(20).optional(),
});

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

// ==========================================
// Change Password
// ==========================================

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'La contraseña actual es requerida'),
  newPassword: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
    .regex(/[0-9]/, 'Debe contener al menos un número')
    .regex(/[^A-Za-z0-9]/, 'Debe contener al menos un carácter especial'),
});

export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;

// ==========================================
// Address
// ==========================================

export const CreateAddressSchema = z.object({
  label: z.enum(['HOME', 'OFFICE', 'OTHER']),
  street: z.string().min(1).max(200),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  zipCode: z.string().min(1).max(20),
  country: z.string().min(1).max(100).default('MX'),
  isDefault: z.boolean().default(false),
});

export type CreateAddressInput = z.infer<typeof CreateAddressSchema>;

export const UpdateAddressSchema = CreateAddressSchema.partial();

export type UpdateAddressInput = z.infer<typeof UpdateAddressSchema>;

// ==========================================
// Review
// ==========================================

export const CreateReviewSchema = z.object({
  productId: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(1000),
});

export type CreateReviewInput = z.infer<typeof CreateReviewSchema>;
