import DOMPurify from 'isomorphic-dompurify';
import { prisma } from '../../lib/prisma';
import type { FastifyInstance } from 'fastify';

/**
 * Helpers de productos: generacion de slugs, sanitizacion,
 * validacion de seguridad y auditoria de admin.
 */

// ==========================================
// Slug generation
// ==========================================

/**
 * Genera un slug seguro desde un nombre.
 * Si ya existe, agrega un sufijo numerico incremental.
 */
export async function generateSlug(name: string, existingId?: string): Promise<string> {
  const base = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remover acentos
    .replace(/[^a-z0-9]+/g, '-') // Caracteres no alfanumericos → guion
    .replace(/^-+|-+$/g, '') // Remover guiones al inicio/fin
    .replace(/-+/g, '-'); // Multi-guion → simple

  let slug = base;
  let counter = 1;

  while (true) {
    const existing = await prisma.product.findUnique({
      where: { slug },
      select: { id: true },
    });

    // Si no existe, o es el mismo producto (update), usarlo
    if (!existing || existing.id === existingId) {
      return slug;
    }

    slug = `${base}-${counter}`;
    counter++;
  }
}

export async function generateCategorySlug(name: string): Promise<string> {
  const base = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');

  let slug = base;
  let counter = 1;

  while (true) {
    const existing = await prisma.category.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!existing) return slug;

    slug = `${base}-${counter}`;
    counter++;
  }
}

export async function generateBrandSlug(name: string): Promise<string> {
  const base = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');

  let slug = base;
  let counter = 1;

  while (true) {
    const existing = await prisma.brand.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!existing) return slug;

    slug = `${base}-${counter}`;
    counter++;
  }
}

// ==========================================
// Sanitizacion HTML
// ==========================================

/**
 * Sanitiza texto HTML con DOMPurify.
 * Remueve scripts, event handlers y tags peligrosos.
 */
export function sanitizeHtml(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4'],
    ALLOWED_ATTR: [],
  });
}

// ==========================================
// Validacion de imagenes
// ==========================================

const CLOUDINARY_REGEX = /^https:\/\/res\.cloudinary\.com\//;

/**
 * Valida que todas las URLs de imagenes sean de Cloudinary.
 */
export function validateImageUrls(images: string[]): boolean {
  return images.every((url) => CLOUDINARY_REGEX.test(url));
}

// ==========================================
// Stock status
// ==========================================

export type StockStatus = 'available' | 'low_stock' | 'out_of_stock';

/**
 * Convierte stock numerico a texto seguro (nunca expone el numero exacto).
 */
export function getStockStatus(stock: number, lowStockThreshold: number): StockStatus {
  if (stock <= 0) return 'out_of_stock';
  if (stock <= lowStockThreshold) return 'low_stock';
  return 'available';
}

// ==========================================
// Specs size validation
// ==========================================

/**
 * Verifica que el JSON de specs no exceda 10KB.
 */
export function validateSpecsSize(specs: Record<string, unknown>): boolean {
  const size = Buffer.byteLength(JSON.stringify(specs));
  return size <= 10240; // 10KB
}

// ==========================================
// Admin audit logging
// ==========================================

/**
 * Registra una accion de admin en la tabla AdminAuditLog.
 */
export async function logAdminAction(
  adminId: string,
  action: string,
  entityType: string,
  entityId: string,
  oldValues?: Record<string, unknown> | null,
  newValues?: Record<string, unknown> | null,
  ipAddress?: string
): Promise<void> {
  await prisma.adminAuditLog.create({
    data: {
      adminId,
      action,
      entityType,
      entityId,
      oldValues: oldValues ?? null,
      newValues: newValues ?? null,
      ipAddress: ipAddress ?? null,
    },
  });
}

// ==========================================
// Transformacion de producto publico
// ==========================================

export interface PublicProduct {
  id: string;
  sku: string;
  name: string;
  slug: string;
  description: string;
  specs: Record<string, unknown> | null;
  price: number;
  comparePrice: number | null;
  stockStatus: StockStatus;
  images: string[];
  isActive: boolean;
  isFeatured: boolean;
  categoryId: string;
  brandId: string | null;
  createdAt: Date;
  updatedAt: Date;
  category?: { id: string; name: string; slug: string };
  brand?: { id: string; name: string; slug: string; logo: string | null };
  reviewSummary?: { averageRating: number; totalReviews: number };
}

export interface PublicProductDetail extends PublicProduct {
  reviews: {
    id: string;
    rating: number;
    title: string;
    body: string;
    user: { name: string | null };
    createdAt: Date;
  }[];
}

/**
 * Transforma un producto de Prisma a formato publico (sin cost, con stockStatus).
 */
export function toPublicProduct(
  product: Record<string, unknown> & { stock: number; lowStockThreshold: number }
): PublicProduct {
  const { stock, lowStockThreshold, cost, ...rest } = product as Record<string, unknown>;

  return {
    ...(rest as Omit<typeof rest, 'cost'>),
    stockStatus: getStockStatus(stock, lowStockThreshold),
  } as PublicProduct;
}
