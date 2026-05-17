import { prisma } from '../../lib/prisma';
import DOMPurify from 'isomorphic-dompurify';
import type { FastifyInstance } from 'fastify';

/**
 * Servicio de reseñas de productos.
 */

/**
 * Verifica si el usuario compró el producto (orden DELIVERED).
 */
export async function verifyProductPurchase(
  userId: string,
  productId: string
): Promise<boolean> {
  const orderItem = await prisma.orderItem.findFirst({
    where: {
      productId,
      order: {
        userId,
        status: 'DELIVERED',
      },
    },
  });

  return !!orderItem;
}

/**
 * Verifica si el usuario ya resenó el producto.
 */
export async function hasUserReviewedProduct(
  userId: string,
  productId: string
): Promise<boolean> {
  const review = await prisma.review.findUnique({
    where: {
      userId_productId: {
        userId,
        productId,
      },
    },
  });

  return !!review;
}

/**
 * Crea una nueva reseña.
 */
export async function createReview(
  {
    userId,
    productId,
    rating,
    title,
    body,
  }: {
    userId: string;
    productId: string;
    rating: number;
    title: string;
    body: string;
  }
): Promise<{ success: boolean; review?: unknown; error?: string }> {
  // Verificar que el producto exista
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });

  if (!product) {
    return { success: false, error: 'Producto no encontrado.' };
  }

  // Verificar compra
  const isVerifiedPurchase = await verifyProductPurchase(userId, productId);

  // Verificar que no exista reseña previa
  const alreadyReviewed = await hasUserReviewedProduct(userId, productId);
  if (alreadyReviewed) {
    return { success: false, error: 'Ya has resenado este producto.' };
  }

  // Sanitizar
  const cleanTitle = DOMPurify.sanitize(title, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });

  const cleanBody = DOMPurify.sanitize(body, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: [],
  });

  const review = await prisma.review.create({
    data: {
      userId,
      productId,
      rating,
      title: cleanTitle,
      body: cleanBody,
      isVerifiedPurchase,
      isApproved: false,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return { success: true, review };
}

/**
 * Lista reseñas aprobadas de un producto.
 */
export async function getProductReviews(productId: string, page: number, pageSize: number) {
  const [data, total] = await Promise.all([
    prisma.review.findMany({
      where: {
        productId,
        isApproved: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
    prisma.review.count({
      where: { productId, isApproved: true },
    }),
  ]);

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Lista TODAS las reseñas (para admin).
 */
export async function getAllReviews({
  isApproved,
  productId,
  userId,
  page,
  pageSize,
}: {
  isApproved?: boolean;
  productId?: string;
  userId?: string;
  page: number;
  pageSize: number;
}) {
  const where: Record<string, unknown> = {};
  if (isApproved !== undefined) where.isApproved = isApproved;
  if (productId) where.productId = productId;
  if (userId) where.userId = userId;

  const [data, total] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    }),
    prisma.review.count({ where }),
  ]);

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Aprueba una reseña.
 */
export async function approveReview(reviewId: string): Promise<boolean> {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
  });

  if (!review) return false;

  await prisma.review.update({
    where: { id: reviewId },
    data: { isApproved: true },
  });

  return true;
}

/**
 * Elimina una reseña.
 */
export async function deleteReview(reviewId: string): Promise<boolean> {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
  });

  if (!review) return false;

  await prisma.review.delete({
    where: { id: reviewId },
  });

  return true;
}
