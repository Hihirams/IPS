import type { FastifyInstance } from 'fastify';
import { optionalAuth } from '../../middleware/auth.middleware';
import { AddToCartSchema, UpdateCartItemSchema, MergeCartSchema } from './cart.schema';
import type { AddToCartInput, UpdateCartItemInput, MergeCartInput } from './cart.schema';
import {
  getOrCreateCart,
  addItemToCart,
  updateItemQuantity,
  removeItemFromCart,
  clearCart,
  getCartWithProducts,
  mergeCarts,
  calculateCartTotals,
  generateAnonymousSessionId,
} from './cart.service';

/**
 * Opciones para cookie de sesión anónima del carrito.
 */
const ANONYMOUS_CART_COOKIE = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
  maxAge: 30 * 24 * 60 * 60, // 30 días
};

/**
 * Registra todas las rutas del carrito.
 */
export async function cartRoutes(app: FastifyInstance) {
  // ==========================================
  // GET /api/cart
  // ==========================================
  app.get('/api/cart', { preHandler: [optionalAuth] }, async (request, reply) => {
    const userId = request.user?.id;
    let sessionId = request.cookies.cart_session_id;

    // Si es anónimo y no tiene sessionId, generar uno nuevo
    if (!userId && !sessionId) {
      sessionId = generateAnonymousSessionId();
      reply.setCookie('cart_session_id', sessionId, ANONYMOUS_CART_COOKIE);
    }

    const cart = await getOrCreateCart(userId, sessionId);
    const { items, priceAlerts, stockAlerts } = await getCartWithProducts(cart.id);
    const { subtotal, itemCount } = calculateCartTotals(items);

    return reply.status(200).send({
      success: true,
      data: {
        items,
        priceAlerts,
        stockAlerts,
        subtotal,
        itemCount,
      },
    });
  });

  // ==========================================
  // POST /api/cart/items
  // ==========================================
  app.post('/api/cart/items', { preHandler: [optionalAuth] }, async (request, reply) => {
    const userId = request.user?.id;
    const sessionId = request.cookies.cart_session_id;
    const data = request.validate(AddToCartSchema, 'body') as AddToCartInput;

    const cart = await getOrCreateCart(userId, sessionId);
    const result = await addItemToCart(cart.id, data.productId, data.quantity);

    if (!result.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'CART_ERROR', message: result.error! },
      });
    }

    return reply.status(200).send({
      success: true,
      data: { message: 'Producto agregado al carrito.' },
    });
  });

  // ==========================================
  // PATCH /api/cart/items/:itemId
  // ==========================================
  app.patch(
    '/api/cart/items/:itemId',
    { preHandler: [optionalAuth] },
    async (request, reply) => {
      const userId = request.user?.id;
      const sessionId = request.cookies.cart_session_id;
      const { itemId } = request.params as { itemId: string };
      const data = request.validate(UpdateCartItemSchema, 'body') as UpdateCartItemInput;

      const cart = await getOrCreateCart(userId, sessionId);
      const result = await updateItemQuantity(cart.id, itemId, data.quantity);

      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'CART_ERROR', message: result.error! },
        });
      }

      return reply.status(200).send({
        success: true,
        data: { message: 'Cantidad actualizada.' },
      });
    }
  );

  // ==========================================
  // DELETE /api/cart/items/:itemId
  // ==========================================
  app.delete(
    '/api/cart/items/:itemId',
    { preHandler: [optionalAuth] },
    async (request, reply) => {
      const userId = request.user?.id;
      const sessionId = request.cookies.cart_session_id;
      const { itemId } = request.params as { itemId: string };

      const cart = await getOrCreateCart(userId, sessionId);
      await removeItemFromCart(cart.id, itemId);

      return reply.status(204).send();
    }
  );

  // ==========================================
  // DELETE /api/cart
  // ==========================================
  app.delete('/api/cart', { preHandler: [optionalAuth] }, async (request, reply) => {
    const userId = request.user?.id;
    const sessionId = request.cookies.cart_session_id;

    const cart = await getOrCreateCart(userId, sessionId);
    await clearCart(cart.id);

    return reply.status(204).send();
  });

  // ==========================================
  // POST /api/cart/merge
  // ==========================================
  app.post('/api/cart/merge', { preHandler: [optionalAuth] }, async (request, reply) => {
    const userId = request.user?.id;
    const sessionId = request.cookies.cart_session_id;

    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Se requiere autenticación.' },
      });
    }

    if (!sessionId) {
      return reply.status(200).send({
        success: true,
        data: { message: 'No hay carrito anónimo para mergear.' },
      });
    }

    const result = await mergeCarts(userId, sessionId);

    if (!result.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'MERGE_ERROR', message: result.error! },
      });
    }

    // Limpiar cookie anónima
    reply.clearCookie('cart_session_id', ANONYMOUS_CART_COOKIE);

    return reply.status(200).send({
      success: true,
      data: { message: 'Carrito mergeado exitosamente.' },
    });
  });
}
