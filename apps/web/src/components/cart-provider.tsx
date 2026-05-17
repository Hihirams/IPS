'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { CartWithProducts } from '@ecommerce/types';

interface CartContextType {
  cart: CartWithProducts | null;
  itemCount: number;
  isLoading: boolean;
  addItem: (productId: string, quantity: number) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartWithProducts | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchCart = useCallback(async () => {
    try {
      // SECURITY FIX: Cookie httpOnly se envía automáticamente; no necesitamos Authorization header
      const res = await fetch('/api/cart', { credentials: 'include' });
      const json = await res.json();
      if (json.success) {
        setCart(json.data);
      }
    } catch {
      // Ignorar errores de red
    }
  }, []);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const addItem = useCallback(
    async (productId: string, quantity: number) => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/cart/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ productId, quantity }),
        });
        const json = await res.json();
        if (json.success) {
          await fetchCart();
        }
      } finally {
        setIsLoading(false);
      }
    },
    [fetchCart]
  );

  const updateQuantity = useCallback(
    async (itemId: string, quantity: number) => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/cart/items/${itemId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ quantity }),
        });
        if (res.ok) {
          await fetchCart();
        }
      } finally {
        setIsLoading(false);
      }
    },
    [fetchCart]
  );

  const removeItem = useCallback(
    async (itemId: string) => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/cart/items/${itemId}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        if (res.ok) {
          await fetchCart();
        }
      } finally {
        setIsLoading(false);
      }
    },
    [fetchCart]
  );

  const clearCart = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/cart', {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        setCart(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const itemCount = cart?.itemCount ?? 0;

  return (
    <CartContext.Provider
      value={{
        cart,
        itemCount,
        isLoading,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        refreshCart: fetchCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart debe usarse dentro de un CartProvider');
  }
  return context;
}
