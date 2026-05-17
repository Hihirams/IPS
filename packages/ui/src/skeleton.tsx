import * as React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'card' | 'text' | 'image' | 'avatar';
  lines?: number;
}

/**
 * Skeleton loader reutilizable.
 *
 * Variantes:
 * - card: Tarjeta completa con imagen y texto
 * - text: Líneas de texto
 * - image: Rectángulo de imagen
 * - avatar: Círculo de avatar
 */
export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ variant = 'text', lines = 3, className, ...props }, ref) => {
    if (variant === 'card') {
      return (
        <div
          ref={ref}
          className={`animate-pulse rounded-xl border border-slate-200 bg-white p-4 ${className || ''}`}
          {...props}
        >
          <div className="aspect-[4/3] rounded-lg bg-slate-200" />
          <div className="mt-3 space-y-2">
            <div className="h-4 w-1/3 rounded bg-slate-200" />
            <div className="h-5 w-3/4 rounded bg-slate-200" />
            <div className="h-5 w-1/4 rounded bg-slate-200" />
          </div>
        </div>
      );
    }

    if (variant === 'image') {
      return (
        <div
          ref={ref}
          className={`animate-pulse rounded-lg bg-slate-200 ${className || ''}`}
          {...props}
        />
      );
    }

    if (variant === 'avatar') {
      return (
        <div
          ref={ref}
          className={`animate-pulse rounded-full bg-slate-200 ${className || ''}`}
          {...props}
        />
      );
    }

    // Default: text lines
    return (
      <div ref={ref} className={`animate-pulse space-y-2 ${className || ''}`} {...props}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="h-4 rounded bg-slate-200"
            style={{ width: `${100 - (i % 3) * 20}%` }}
          />
        ))}
      </div>
    );
  }
);

Skeleton.displayName = 'Skeleton';
