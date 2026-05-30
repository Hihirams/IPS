'use client';

import { useState } from 'react';

interface StarRatingProps {
  rating: number;
  readOnly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onRate?: (rating: number) => void;
}

/**
 * Componente de rating con estrellas.
 *
 * Soporta modo solo lectura y modo escritura.
 * Muestra medias estrellas con precisión de 0.5.
 */
export function StarRating({ rating, readOnly = false, size = 'md', onRate }: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  const renderStar = (starIndex: number) => {
    const displayRating = hoverRating || rating;
    const filled = starIndex <= Math.floor(displayRating);
    const halfFilled =
      !filled && starIndex === Math.ceil(displayRating) && displayRating % 1 >= 0.5;

    return (
      <button
        key={starIndex}
        type="button"
        disabled={readOnly}
        onClick={() => onRate?.(starIndex)}
        onMouseEnter={() => !readOnly && setHoverRating(starIndex)}
        onMouseLeave={() => !readOnly && setHoverRating(0)}
        className={`${readOnly ? 'cursor-default' : 'cursor-pointer'} p-0.5 focus:outline-none`}
      >
        <svg
          className={`${sizeClasses[size]} transition-colors ${
            filled || halfFilled ? 'text-amber-400' : 'text-black/15'
          }`}
          viewBox="0 0 20 20"
          fill={filled ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <defs>
            <linearGradient id={`half-${starIndex}`}>
              <stop offset="50%" stopColor="currentColor" />
              <stop offset="50%" stopColor="transparent" />
            </linearGradient>
          </defs>
          <path
            fill={halfFilled ? `url(#half-${starIndex})` : undefined}
            d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
          />
        </svg>
      </button>
    );
  };

  return (
    <div className="flex items-center" role={readOnly ? 'img' : 'group'}>
      <div className="flex">
        {[1, 2, 3, 4, 5].map((i) => renderStar(i))}
      </div>
      {readOnly && <span className="ml-2 text-sm text-ink-2">{rating.toFixed(1)}</span>}
    </div>
  );
}
