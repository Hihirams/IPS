import { prisma } from '../../lib/prisma';
import type { Prisma } from '@prisma/client';

/**
 * Servicio de carrito — lógica de negocio.
 *
 * Soporta carritos anónimos (por sessionId) y carritos de usuario (por userId).
 */

const MAX_DISTINCT_ITEMS = 10;

/**
 * Obtiene o crea un carrito por userId o sessionId.
 */
export async function getOrCreateCart(
  userId?: string,
  sessionId?: string
): Promise<{ id: string; userId: string | null; sessionId: string | null }> {
  // Buscar carrito existente
  let cart: { id: string; userId: string | null; sessionId: string | null } | null = null;

  if (userId) {
    cart = await prisma.cart.findUnique({
      where: { userId },
      select: { id: true, userId: true, sessionId: true },
    });
  } else if (sessionId) {
    cart = await prisma.cart.findUnique({
      where: { sessionId },
      select: { id: true, userId: true, sessionId: true },
    });
  }

  if (cart) return cart;

  // Crear nuevo carrito
  return prisma.cart.create({
    data: {
      userId: userId ?? null,
      sessionId: sessionId ?? null,
    },
    select: { id: true, userId: true, sessionId: true },
  });
}

/**
 * Agrega un item al carrito.
 */
export async function addItemToCart(
  cartId: string,
  productId: string,
  quantity: number
): Promise<{ success: boolean; error?: string; item?: Record<string, unknown> }> {
  // Verificar producto
  const product = await prisma.product.findUnique({
    where: { id: productId, isActive: true },
    select: { id: true, name: true, price: true, stock: true, isActive: true, images: true },
  });

  if (!product) {
    return { success: false, error: 'Producto no encontrado o inactivo.' };
  }

  // Verificar límite de items distintos
  const existingItems = await prisma.cartItem.count({ where: { cartId } });

  const existingItem = await prisma.cartItem.findUnique({
    where: { cartId_productId: { cartId, productId } },
  });

  const newQuantity = (existingItem?.quantity ?? 0) + quantity;

  if (newQuantity > 99) {
    return { success: false, error: 'Máximo 99 unidades por producto.' };
  }

  if (!existingItem && existingItems >= MAX_DISTINCT_ITEMS) {
    return { success: false, error: 'Máximo 10 productos distintos en el carrito.' };
  }

  // Crear o actualizar item
  const item = await prisma.cartItem.upsert({
    where: { cartId_productId: { cartId, productId } },
    create: {
      cartId,
      productId,
      quantity: newQuantity,
      priceAtTime: product.price,
    },
    update: {
      quantity: newQuantity,
      priceAtTime: product.price,
    },
  });

  return { success: true, item };
}

/**
 * Actualiza la cantidad de un item.
 */
export async function updateItemQuantity(
  cartId: string,
  itemId: string,
  quantity: number
): Promise<{ success: boolean; error?: string }> {
  const item = await prisma.cartItem.findFirst({
    where: { id: itemId, cartId },
    include: { product: { select: { stock: true, isActive: true } } },
  });

  if (!item) {
    return { success: false, error: 'Item no encontrado.' };
  }

  if (quantity === 0) {
    await prisma.cartItem.delete({ where: { id: itemId } });
    return { success: true };
  }

  if (quantity > 99) {
    return { success: false, error: 'Máximo 99 unidades por producto.' };
  }

  await prisma.cartItem.update({
    where: { id: itemId },
    data: { quantity },
  });

  return { success: true };
}

/**
 * Elimina un item del carrito.
 */
export async function removeItemFromCart(cartId: string, itemId: string): Promise<void> {
  await prisma.cartItem.deleteMany({
    where: { id: itemId, cartId },
  });
}

/**
 * Vacía el carrito.
 */
export async function clearCart(cartId: string): Promise<void> {
  await prisma.cartItem.deleteMany({
    where: { cartId },
  });
}

/**
 * Obtiene el carrito con productos y verifica cambios de precio.
 */
export async function getCartWithProducts(
  cartId: string
): Promise<{
  items: Array<{
    id: string;
    quantity: number;
    priceAtTime: number;
    product: {
      id: string;
      name: string;
      slug: string;
      price: number;
      comparePrice: number | null;
      stock: number;
      images: string[];
      brand: { name: string } | null;
    };
    priceChanged: boolean;
    currentPrice: number;
  }>;
  priceAlerts: Array<{ productId: string; productName: string; oldPrice: number; newPrice: number }>;
  stockAlerts: Array<{ productId: string; productName: string; requested: number; available: number }>;
}> {
  const items = await prisma.cartItem.findMany({
    where: { cartId },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          comparePrice: true,
          stock: true,
          images: true,
          syscomId: true,
          brand: { select: { name: true } },
          isActive: true,
        },
      },
    },
    orderBy: { id: 'desc' },
  });

  const priceAlerts: Array<{ productId: string; productName: string; oldPrice: number; newPrice: number }> = [];
  const stockAlerts: Array<{ productId: string; productName: string; requested: number; available: number }> = [];

  const mappedItems = items.map((item) => {
    const priceAtTime = Number(item.priceAtTime);
    const currentPrice = Number(item.product.price);
    const comparePrice = item.product.comparePrice === null ? null : Number(item.product.comparePrice);
    const priceChanged = priceAtTime !== currentPrice;
    const stockShortage = item.quantity > item.product.stock;

    if (priceChanged) {
      priceAlerts.push({
        productId: item.product.id,
        productName: item.product.name,
        oldPrice: priceAtTime,
        newPrice: currentPrice,
      });
    }

    if (stockShortage) {
      stockAlerts.push({
        productId: item.product.id,
        productName: item.product.name,
        requested: item.quantity,
        available: item.product.stock,
      });
    }

    return {
      id: item.id,
      quantity: item.quantity,
      priceAtTime,
      product: {
        ...item.product,
        price: currentPrice,
        comparePrice,
      },
      priceChanged,
      currentPrice,
    };
  });

  return { items: mappedItems, priceAlerts, stockAlerts };
}

/**
 * Mergea carrito anónimo en carrito de usuario.
 */
export async function mergeCarts(
  userId: string,
  anonymousSessionId: string
): Promise<{ success: boolean; error?: string }> {
  // Buscar carrito anónimo
  const anonymousCart = await prisma.cart.findUnique({
    where: { sessionId: anonymousSessionId },
    include: { items: true },
  });

  if (!anonymousCart || anonymousCart.items.length === 0) {
    return { success: true }; // Nada que mergear
  }

  // Buscar o crear carrito del usuario
  const userCart = await prisma.cart.upsert({
    where: { userId },
    create: { userId },
    update: {},
    include: { items: true },
  });

  // Merge items
  for (const anonItem of anonymousCart.items) {
    const existingItem = userCart.items.find((i) => i.productId === anonItem.productId);

    if (existingItem) {
      // Usar la mayor cantidad
      const maxQuantity = Math.max(existingItem.quantity, anonItem.quantity);
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: Math.min(maxQuantity, 99),
          priceAtTime: anonItem.priceAtTime,
        },
      });
    } else {
      // Verificar límite de items
      const currentCount = await prisma.cartItem.count({ where: { cartId: userCart.id } });
      if (currentCount < MAX_DISTINCT_ITEMS) {
        await prisma.cartItem.create({
          data: {
            cartId: userCart.id,
            productId: anonItem.productId,
            quantity: Math.min(anonItem.quantity, 99),
            priceAtTime: anonItem.priceAtTime,
          },
        });
      }
    }
  }

  // Eliminar carrito anónimo
  await prisma.cart.delete({ where: { id: anonymousCart.id } });

  return { success: true };
}

/**
 * Calcula totales del carrito.
 */
export function calculateCartTotals(items: Array<{ quantity: number; currentPrice: number }>): {
  subtotal: number;
  itemCount: number;
} {
  const subtotal = items.reduce((sum, item) => sum + item.currentPrice * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  return { subtotal, itemCount };
}

/**
 * Genera un sessionId para carritos anónimos.
 */
export function generateAnonymousSessionId(): string {
  return `anon_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}
