'use client';

import { useCart } from './cart-provider';
import { formatPrice } from '@/lib/utils';

interface CartItemRowProps {
  item: {
    id: string;
    quantity: number;
    currentPrice: number;
    product: {
      id: string;
      name: string;
      slug: string;
      images: string[];
      brand: { name: string } | null;
      stock: number;
    };
    priceChanged: boolean;
  };
}

export function CartItemRow({ item }: CartItemRowProps) {
  const { updateQuantity, removeItem, isLoading } = useCart();

  const handleQuantityChange = (delta: number) => {
    const newQty = item.quantity + delta;
    if (newQty >= 0 && newQty <= 99) {
      updateQuantity(item.id, newQty);
    }
  };

  const subtotal = item.currentPrice * item.quantity;

  return (
    <div className="flex gap-4 p-4">
      {/* Imagen */}
      <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-[16px] bg-black/[0.03]">
        {item.product.images[0] ? (
          <img
            src={item.product.images[0]}
            alt={item.product.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-ink-4">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col">
        <div className="flex justify-between">
          <div>
            {item.product.brand && (
              <span className="text-[11px] font-semibold uppercase tracking-[0.4px] text-ink-3">{item.product.brand.name}</span>
            )}
            <h3 className="text-sm font-medium text-ink-1">{item.product.name}</h3>
          </div>
          <button
            onClick={() => removeItem(item.id)}
            disabled={isLoading}
            className="h-fit rounded-full px-2.5 py-1 text-sm text-red-500 transition hover:bg-red-500/10 disabled:opacity-50"
          >
            Eliminar
          </button>
        </div>

        {item.priceChanged && (
          <span className="mt-1 text-xs text-amber-600">
            ⚠ El precio ha cambiado desde que lo agregaste
          </span>
        )}

        <div className="mt-auto flex items-center justify-between">
          {/* Selector de cantidad */}
          <div className="glass-card flex items-center rounded-full p-0.5">
            <button
              onClick={() => handleQuantityChange(-1)}
              disabled={isLoading || item.quantity <= 1}
              className="flex h-8 w-8 items-center justify-center rounded-full text-ink-2 transition hover:bg-black/[0.05] disabled:opacity-40"
            >
              −
            </button>
            <span className="w-9 text-center text-sm font-semibold text-ink-1">{item.quantity}</span>
            <button
              onClick={() => handleQuantityChange(1)}
              disabled={isLoading || item.quantity >= 99}
              className="flex h-8 w-8 items-center justify-center rounded-full text-ink-2 transition hover:bg-black/[0.05] disabled:opacity-40"
            >
              +
            </button>
          </div>

          {/* Subtotal */}
          <span className="text-sm font-semibold text-ink-1">
            {formatPrice(subtotal)}
          </span>
        </div>
      </div>
    </div>
  );
}
