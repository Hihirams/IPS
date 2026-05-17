'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/components/cart-provider';

interface AddToCartControlsProps {
  productId: string;
}

export function AddToCartControls({ productId }: AddToCartControlsProps) {
  const { addItem, isLoading } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState('');
  const [added, setAdded] = useState(false);

  const handleAdd = async () => {
    setError('');
    setAdded(false);

    try {
      await addItem(productId, quantity);
      setAdded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo agregar al carrito.');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <div className="flex items-center rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={() => setQuantity((value) => Math.max(1, value - 1))}
            disabled={isLoading || quantity <= 1}
            className="px-3 py-2 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            -
          </button>
          <span className="w-10 text-center text-sm font-medium">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity((value) => Math.min(99, value + 1))}
            disabled={isLoading || quantity >= 99}
            className="px-3 py-2 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            +
          </button>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={isLoading}
          className="flex-1 rounded-lg bg-slate-900 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {isLoading ? 'Agregando...' : 'Agregar al Carrito'}
        </button>
      </div>

      {added && (
        <p className="text-sm text-green-700">
          Producto agregado.{' '}
          <Link href="/carrito" className="font-medium underline">
            Ver carrito
          </Link>
        </p>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
