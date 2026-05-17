import { z } from 'zod';

/**
 * Esquemas Zod para validación de endpoints de administración.
 */

// ==========================================
// Dashboard
// ==========================================

export const DashboardMetricsSchema = z.object({});

// ==========================================
// Admin Orders Query
// ==========================================

export const AdminOrderQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  status: z.enum(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED']).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  userId: z.string().optional(),
  search: z.string().max(100).optional(),
});

export type AdminOrderQueryInput = z.infer<typeof AdminOrderQuerySchema>;

// ==========================================
// Update Order Status
// ==========================================

export const UpdateOrderStatusSchema = z.object({
  status: z.enum(['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED']),
  notes: z.string().max(1000).optional(),
});

export type UpdateOrderStatusInput = z.infer<typeof UpdateOrderStatusSchema>;

// ==========================================
// Admin Users Query
// ==========================================

export const AdminUserQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  search: z.string().max(100).optional(),
});

export type AdminUserQueryInput = z.infer<typeof AdminUserQuerySchema>;

// ==========================================
// Ban User
// ==========================================

export const BanUserSchema = z.object({
  reason: z.string().min(1).max(500, 'La razón no puede exceder 500 caracteres'),
});

export type BanUserInput = z.infer<typeof BanUserSchema>;

// ==========================================
// Audit Log Query
// ==========================================

export const AuditLogQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  adminId: z.string().optional(),
  action: z.string().optional(),
  entityType: z.string().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type AuditLogQueryInput = z.infer<typeof AuditLogQuerySchema>;
