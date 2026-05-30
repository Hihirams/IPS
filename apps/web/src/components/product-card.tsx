'use client';

import Link from 'next/link';
import type { PublicProduct, StockStatus } from '@ecommerce/types';
import { PriceDisplay } from '@/components/price-display';

function StockBadge({ stockStatus, stock }: { stockStatus: StockStatus; stock: number }) {
  if (stockStatus === 'available') {
    return (
      <span className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-ink-2">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        En stock: {stock} uds.
      </span>
    );
  }
  if (stockStatus === 'low_stock') {
    return (
      <span className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-amber-600">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        Pocas unidades: {stock} uds.
      </span>
    );
  }
  return (
    <span className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-ink-3">
      <span className="h-1.5 w-1.5 rounded-full bg-ink-4" />
      Disponible por pedido (~1 semana)
    </span>
  );
}

interface ProductCardProps {
  product: PublicProduct;
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Link
      href={`/productos/${product.slug}`}
      className="glass-interactive group flex flex-col rounded-[22px] p-3.5"
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-[16px] bg-black/[0.03]">
        {product.images[0] ? (
          <img
            src={product.images[0]}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.07]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-ink-4">
            <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
      </div>

      <div className="mt-3.5 flex flex-1 flex-col px-1">
        {product.brand && (
          <span className="text-[11px] font-semibold uppercase tracking-[0.4px] text-ink-3">
            {product.brand.name}
          </span>
        )}
        <h3 className="mt-1 line-clamp-2 text-sm font-medium leading-snug text-ink-1">
          {product.name}
        </h3>
        <div className="mt-auto pt-3">
          <PriceDisplay usd={product.price} className="text-lg font-semibold tracking-tight text-ink-1" />
        </div>
        <StockBadge stockStatus={product.stockStatus} stock={product.stock} />
      </div>
    </Link>
  );
}
