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
    <div className="flex gap-4 py-4">
      {/* Imagen */}
      <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-slate-100">
        {item.product.images[0] ? (
          <img
            src={item.product.images[0]}
            alt={item.product.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-400">
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
              <span className="text-xs text-slate-500">{item.product.brand.name}</span>
            )}
            <h3 className="text-sm font-medium text-slate-900">{item.product.name}</h3>
          </div>
          <button
            onClick={() => removeItem(item.id)}
            disabled={isLoading}
            className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
          >
            Eliminar
          </button>
        </div>

        {item.priceChanged && (
          <span className="mt-1 text-xs text-yellow-600">
            ⚠ El precio ha cambiado desde que lo agregaste
          </span>
        )}

        <div className="mt-auto flex items-center justify-between">
          {/* Selector de cantidad */}
          <div className="flex items-center rounded-lg border border-slate-200">
            <button
              onClick={() => handleQuantityChange(-1)}
              disabled={isLoading || item.quantity <= 1}
              className="px-3 py-1 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              -
            </button>
            <span className="w-10 text-center text-sm font-medium">{item.quantity}</span>
            <button
              onClick={() => handleQuantityChange(1)}
              disabled={isLoading || item.quantity >= item.product.stock}
              className="px-3 py-1 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              +
            </button>
          </div>

          {/* Subtotal */}
          <span className="text-sm font-semibold text-slate-900">
            {formatPrice(subtotal)}
          </span>
        </div>
      </div>
    </div>
  );
}
