'use client';

/**
 * Muestra un precio en MXN.
 * El precio ya viene convertido (USD→MXN + 35% margen) desde la base de datos.
 * Solo formatea y muestra.
 */

const mxnFmt = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 2,
});

interface PriceDisplayProps {
  /** Precio en MXN (ya con margen aplicado desde el sync) */
  usd: number;
  className?: string;
}

export function PriceDisplay({ usd, className }: PriceDisplayProps) {
  return <span className={className}>{mxnFmt.format(usd)}</span>;
}
