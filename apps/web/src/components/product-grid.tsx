import { ProductCard } from './product-card';
import { SkeletonCard } from './skeleton';
import type { PublicProduct } from '@ecommerce/types';

interface ProductGridProps {
  products?: PublicProduct[];
  isLoading?: boolean;
  columns?: number;
}

/**
 * Grid responsive de productos.
 *
 * Soporta estado de carga con skeletons.
 */
export function ProductGrid({
  products = [],
  isLoading = false,
  columns = 4,
}: ProductGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: columns * 3 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
