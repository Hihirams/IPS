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
      <div className="flex items-center gap-3">
        <div className="glass-card flex items-center rounded-full p-0.5">
          <button
            type="button"
            onClick={() => setQuantity((value) => Math.max(1, value - 1))}
            disabled={isLoading || quantity <= 1}
            className="flex h-9 w-9 items-center justify-center rounded-full text-lg text-ink-2 transition hover:bg-black/[0.05] disabled:opacity-40"
          >
            −
          </button>
          <span className="w-9 text-center text-sm font-semibold text-ink-1">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity((value) => Math.min(99, value + 1))}
            disabled={isLoading || quantity >= 99}
            className="flex h-9 w-9 items-center justify-center rounded-full text-lg text-ink-2 transition hover:bg-black/[0.05] disabled:opacity-40"
          >
            +
          </button>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={isLoading}
          className="btn-primary flex-1 py-3"
        >
          {isLoading ? 'Agregando…' : 'Agregar al carrito'}
        </button>
      </div>

      {added && (
        <p className="animate-fade-in text-sm text-emerald-600">
          Producto agregado.{' '}
          <Link href="/carrito" className="font-medium underline">
            Ver carrito
          </Link>
        </p>
      )}

      {error && <p className="animate-fade-in text-sm text-red-500">{error}</p>}
    </div>
  );
}
