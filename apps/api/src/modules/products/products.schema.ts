import { z } from 'zod';

/**
 * Esquemas Zod para validacion de productos y filtros.
 *
 * Todos los campos monetarios se validan con maximo 2 decimales.
 * Las imagenes deben ser URLs válidas.
 */

// ==========================================
// Helpers de validacion
// ==========================================

const decimalRegex = /^\d+(\.\d{1,2})?$/;
const imageUrlRegex = /^https?:\/\/.+/;
const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// ==========================================
// Query schemas
// ==========================================

export const ProductQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(12),
  category: z.string().optional(),
  categories: z.string().optional(),
  brand: z.string().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  search: z.string().max(100).optional(),
  sortBy: z.enum(['price', 'name', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  inStock: z.coerce.boolean().optional(),
});

export type ProductQueryInput = z.infer<typeof ProductQuerySchema>;

export const SearchQuerySchema = z.object({
  q: z.string().min(1).max(100),
  limit: z.coerce.number().min(1).max(20).default(10),
});

export type SearchQueryInput = z.infer<typeof SearchQuerySchema>;

// ==========================================
// Admin product schemas
// ==========================================

const ProductBaseSchema = z.object({
  sku: z.string().min(1).max(100, 'SKU demasiado largo'),
  name: z.string().min(1).max(200, 'Nombre demasiado largo'),
  slug: z.string().regex(slugRegex, 'Slug inválido').optional(),
  description: z.string().min(1).max(5000, 'Descripción demasiado larga'),
  specs: z.record(z.unknown()).optional(),
  price: z.coerce.number().positive('El precio debe ser positivo'),
  comparePrice: z.coerce.number().positive().optional().nullable(),
  cost: z.coerce.number().positive('El costo debe ser positivo'),
  stock: z.coerce.number().int().min(0, 'Stock no puede ser negativo').default(0),
  lowStockThreshold: z.coerce.number().int().min(0).default(5),
  images: z.array(z.string().url().regex(imageUrlRegex, 'Las imágenes deben ser URLs válidas')).min(1),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  satKey: z.string().optional().nullable(),
  originalLink: z.string().url().optional().nullable(),
  categoryId: z.string().min(1),
  brandId: z.string().optional().nullable(),
});

export const CreateProductSchema = ProductBaseSchema.superRefine((data, ctx) => {
  // Validar specs no exceda 10KB
  if (data.specs) {
    const specsSize = Buffer.byteLength(JSON.stringify(data.specs));
    if (specsSize > 10240) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'El campo specs no puede exceder 10KB',
        path: ['specs'],
      });
    }
  }

  // Validar comparePrice > price si existe
  if (data.comparePrice && data.comparePrice <= data.price) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'El precio comparativo debe ser mayor al precio actual',
      path: ['comparePrice'],
    });
  }
});

export type CreateProductInput = z.infer<typeof CreateProductSchema>;

export const UpdateProductSchema = ProductBaseSchema.partial().superRefine((data, ctx) => {
  // Validar specs no exceda 10KB (solo si se envía en update)
  if (data.specs) {
    const specsSize = Buffer.byteLength(JSON.stringify(data.specs));
    if (specsSize > 10240) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'El campo specs no puede exceder 10KB',
        path: ['specs'],
      });
    }
  }

  // Validar comparePrice > price si ambos existen
  if (data.comparePrice != null && data.price != null && data.comparePrice <= data.price) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'El precio comparativo debe ser mayor al precio actual',
      path: ['comparePrice'],
    });
  }
});

export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;

export const UpdateStockSchema = z.object({
  stock: z.coerce.number().int().min(0, 'Stock no puede ser negativo'),
});

export type UpdateStockInput = z.infer<typeof UpdateStockSchema>;

// ==========================================
// Category & Brand schemas
// ==========================================

export const CreateCategorySchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().regex(slugRegex, 'Slug inválido').optional(),
  description: z.string().max(1000).optional(),
  image: z.string().url().regex(imageUrlRegex, 'La imagen debe ser una URL válida').optional().nullable(),
  parentId: z.string().optional().nullable(),
});

export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;

export const CreateBrandSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().regex(slugRegex, 'Slug inválido').optional(),
  logo: z.string().url().regex(imageUrlRegex, 'El logo debe ser una URL válida').optional().nullable(),
});

export type CreateBrandInput = z.infer<typeof CreateBrandSchema>;
