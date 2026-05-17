'use client';

import Link from 'next/link';
import type { PublicProduct } from '@ecommerce/types';

interface ProductCardProps {
  product: PublicProduct;
}

/**
 * Tarjeta de producto para el catálogo.
 *
 * Muestra imagen, nombre, precio, marca, descuento y estado de stock.
 */
export function ProductCard({ product }: ProductCardProps) {
  const discount = product.comparePrice
    ? Math.round((1 - product.price / product.comparePrice) * 100)
    : 0;

  return (
    <Link
      href={`/productos/${product.slug}`}
      className="group flex flex-col rounded-xl border border-slate-200 bg-white p-4 transition hover:shadow-md"
    >
      {/* Imagen */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-slate-100">
        {product.images[0] ? (
          <img
            src={product.images[0]}
            alt={product.name}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-400">
            <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}

        {/* Badges */}
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {discount > 0 && (
            <span className="rounded bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
              -{discount}%
            </span>
          )}
          {product.isFeatured && (
            <span className="rounded bg-blue-600 px-2 py-0.5 text-xs font-bold text-white">
              Destacado
            </span>
          )}
          {product.stockStatus === 'out_of_stock' && (
            <span className="rounded bg-slate-600 px-2 py-0.5 text-xs font-bold text-white">
              Agotado
            </span>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="mt-3 flex flex-1 flex-col">
        {product.brand && (
          <span className="text-xs font-medium text-slate-500">{product.brand.name}</span>
        )}
        <h3 className="mt-1 line-clamp-2 text-sm font-medium text-slate-900">
          {product.name}
        </h3>

        <div className="mt-auto pt-3">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-slate-900">
              ${product.price.toLocaleString('es-MX')}
            </span>
            {product.comparePrice && (
              <span className="text-sm text-slate-400 line-through">
                ${product.comparePrice.toLocaleString('es-MX')}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
