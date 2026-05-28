import { prisma } from '../../lib/prisma';
import type { Prisma } from '@prisma/client';
import { SyscomService } from '../../services/syscom.service';
import type { FastifyInstance } from 'fastify';

/**
 * Servicio de checkout — cálculos de totales, validaciones y reservas de stock.
 */

const SHIPPING_FLAT = 99;
const SHIPPING_FREE_THRESHOLD = 1000;
const TAX_RATE = 0.16; // 16% IVA México
const PRICE_CHANGE_THRESHOLD = 0.05; // 5% de diferencia para alertar

export interface CheckoutItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  name: string;
  sku: string;
}

export interface CheckoutSummary {
  items: CheckoutItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  priceAlerts: Array<{
    productId: string;
    productName: string;
    oldPrice: number;
    newPrice: number;
  }>;
  stockAlerts: Array<{
    productId: string;
    productName: string;
    requested: number;
    available: number;
  }>;
}

/**
 * Valida el carrito del usuario y retorna resumen de checkout.
 */
export async function validateCart(userId: string): Promise<{
  summary: CheckoutSummary;
  cartId: string;
}> {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              price: true,
              stock: true,
              isActive: true,
              images: true,
              syscomId: true,
            },
          },
        },
      },
    },
  });

  if (!cart || cart.items.length === 0) {
    throw new Error('CART_EMPTY');
  }

  const priceAlerts: CheckoutSummary['priceAlerts'] = [];
  const stockAlerts: CheckoutSummary['stockAlerts'] = [];
  const validItems: CheckoutItem[] = [];
  let subtotal = 0;

  for (const item of cart.items) {
    const product = item.product;
    const priceAtTime = Number(item.priceAtTime);
    const currentPrice = Number(product.price);

    if (!product.isActive) {
      stockAlerts.push({
        productId: product.id,
        productName: product.name,
        requested: item.quantity,
        available: 0,
      });
      continue;
    }

    // Verificar cambio de precio
    if (priceAtTime !== currentPrice) {
      priceAlerts.push({
        productId: product.id,
        productName: product.name,
        oldPrice: priceAtTime,
        newPrice: currentPrice,
      });
    }

    // Verificar stock (informativo, no bloqueante)
    if (product.stock < item.quantity) {
      stockAlerts.push({
        productId: product.id,
        productName: product.name,
        requested: item.quantity,
        available: product.stock,
      });
    }

    validItems.push({
      productId: product.id,
      quantity: item.quantity,
      unitPrice: currentPrice,
      name: product.name,
      sku: product.sku,
    });

    subtotal += currentPrice * item.quantity;
  }

  const hasStripeTestProduct = validItems.some((item) => item.sku === 'STRIPE-TEST-10MXN');
  const shipping = hasStripeTestProduct ? 0 : (subtotal >= SHIPPING_FREE_THRESHOLD ? 0 : SHIPPING_FLAT);
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  const total = Math.round((subtotal + shipping + tax) * 100) / 100;

  return {
    summary: {
      items: validItems,
      subtotal,
      shipping,
      tax,
      total,
      priceAlerts,
      stockAlerts,
    },
    cartId: cart.id,
  };
}

/**
 * Verifica stock y precios contra la API de SYSCOM para productos
 * que tienen syscomId. Solo se consulta SYSCOM para los productos
 * del carrito que provienen del proveedor.
 */
export async function validateCartWithSyscom(
  app: FastifyInstance,
  cartItems: Array<{ productId: string; syscomId: string | null; quantity: number }>,
  localSummary: CheckoutSummary
): Promise<CheckoutSummary> {
  const syscomItems = cartItems.filter((item) => item.syscomId !== null);

  if (syscomItems.length === 0) {
    return localSummary;
  }

  const syscom = new SyscomService(app);
  const priceAlerts = [...localSummary.priceAlerts];
  const stockAlerts = [...localSummary.stockAlerts];

  for (const item of syscomItems) {
    try {
      const syscomData = await syscom.getProductStockAndPrice(item.syscomId!);

      const localItem = localSummary.items.find((i) => i.productId === item.productId);
      if (localItem) {
        const syscomPrice = syscomData.precioLista > 0 ? syscomData.precioLista : syscomData.precioEspecial;

        if (syscomPrice > 0 && Math.abs(localItem.unitPrice - syscomPrice) / localItem.unitPrice > PRICE_CHANGE_THRESHOLD) {
          const existingAlert = priceAlerts.find((a) => a.productId === item.productId);
          if (!existingAlert) {
            priceAlerts.push({
              productId: item.productId,
              productName: localItem.name,
              oldPrice: localItem.unitPrice,
              newPrice: syscomPrice,
            });
          }
        }

        if (syscomData.stock < item.quantity) {
          const existingAlert = stockAlerts.find((a) => a.productId === item.productId);
          if (!existingAlert) {
            stockAlerts.push({
              productId: item.productId,
              productName: localItem.name,
              requested: item.quantity,
              available: syscomData.stock,
            });
          }
        }
      }
    } catch (err) {
      app.log.warn(
        { syscomId: item.syscomId, err },
        'No se pudo verificar producto con SYSCOM, usando datos locales'
      );
    }
  }

  return {
    ...localSummary,
    priceAlerts,
    stockAlerts,
  };
}

/**
 * Reserva stock temporalmente (decrementa en DB).
 * Usar dentro de una transacción Prisma.
 */
export async function reserveStock(
  tx: Prisma.TransactionClient,
  items: Array<{ productId: string; quantity: number }>
): Promise<void> {
  for (const item of items) {
    await tx.product.update({
      where: { id: item.productId },
      data: { stock: { decrement: item.quantity } },
    });
  }
}

/**
 * Libera stock reservado (incrementa en DB).
 * Usar dentro de una transacción Prisma.
 */
export async function releaseStock(
  tx: Prisma.TransactionClient,
  items: Array<{ productId: string; quantity: number }>
): Promise<void> {
  for (const item of items) {
    await tx.product.update({
      where: { id: item.productId },
      data: { stock: { increment: item.quantity } },
    });
  }
}

/**
 * Genera número de orden único.
 */
export function generateOrderNumber(): string {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ECO-${datePart}-${randomPart}`;
}

/**
 * Crea una orden en la base de datos.
 */
export async function createOrder(
  userId: string,
  addressId: string,
  summary: CheckoutSummary,
  stripePaymentIntentId: string,
  notes?: string
): Promise<{ id: string; orderNumber: string }> {
  const orderNumber = generateOrderNumber();

  const order = await prisma.order.create({
    data: {
      orderNumber,
      userId,
      addressId,
      status: 'PENDING',
      subtotal: summary.subtotal,
      shipping: summary.shipping,
      tax: summary.tax,
      total: summary.total,
      stripePaymentIntentId,
      notes: notes ?? null,
      items: {
        create: summary.items.map((item) => ({
          productId: item.productId,
          productName: item.name,
          productSku: item.sku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: Math.round(item.unitPrice * item.quantity * 100) / 100,
        })),
      },
      statusHistory: {
        create: {
          status: 'PENDING',
          notes: 'Orden creada, esperando pago.',
        },
      },
    },
  });

  return { id: order.id, orderNumber: order.orderNumber };
}