import * as React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'price' | 'sale' | 'new' | 'out-of-stock' | 'low-stock';
}

/**
 * Badge / Etiqueta reutilizable.
 *
 * Variantes:
 * - price: Precio actual (verde)
 * - sale: Descuento (rojo)
 * - new: Producto nuevo (azul)
 * - out-of-stock: Agotado (gris)
 * - low-stock: Pocas unidades (amarillo)
 */
export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'default', className, children, ...props }, ref) => {
    const variants = {
      default: 'bg-slate-100 text-slate-800',
      price: 'bg-green-100 text-green-800',
      sale: 'bg-red-100 text-red-800',
      new: 'bg-blue-100 text-blue-800',
      'out-of-stock': 'bg-slate-100 text-slate-500',
      'low-stock': 'bg-yellow-100 text-yellow-800',
    };

    return (
      <span
        ref={ref}
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variants[variant]} ${className || ''}`}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';
