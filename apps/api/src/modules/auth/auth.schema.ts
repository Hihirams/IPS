import { z } from 'zod';

/**
 * Esquemas Zod para autenticación.
 *
 * Valida inputs de registro, login y refresh token.
 * Mensajes en español para mejor UX.
 */

// ==========================================
// Password helper
// ==========================================

const PASSWORD_REGEX = {
  uppercase: /[A-Z]/,
  number: /[0-9]/,
  special: /[^A-Za-z0-9]/,
};

// ==========================================
// Registro
// ==========================================

export const RegisterSchema = z.object({
  email: z
    .string()
    .min(1, 'El email es obligatorio')
    .email('Email inválido'),
  password: z
    .string()
    .min(1, 'La contraseña es obligatoria')
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .refine((val) => PASSWORD_REGEX.uppercase.test(val), {
      message: 'Debe contener al menos una mayúscula',
    })
    .refine((val) => PASSWORD_REGEX.number.test(val), {
      message: 'Debe contener al menos un número',
    })
    .refine((val) => PASSWORD_REGEX.special.test(val), {
      message: 'Debe contener al menos un carácter especial',
    }),
  name: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .optional(),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;

// ==========================================
// Login
// ==========================================

export const LoginSchema = z.object({
  email: z
    .string()
    .min(1, 'El email es obligatorio')
    .email('Email inválido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

export type LoginInput = z.infer<typeof LoginSchema>;

// ==========================================
// Refresh Token
// ==========================================

export const RefreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token es obligatorio'),
});

export type RefreshInput = z.infer<typeof RefreshSchema>;

// ==========================================
// MFA Verify
// ==========================================

export const MFAVerifySchema = z.object({
  mfaToken: z.string().min(1, 'Token MFA es obligatorio'),
  code: z
    .string()
    .length(6, 'El código TOTP debe tener 6 dígitos')
    .regex(/^[0-9]+$/, 'El código debe contener solo números'),
});

export type MFAVerifyInput = z.infer<typeof MFAVerifySchema>;
