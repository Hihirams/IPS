'use client';

import { useEffect, useState } from 'react';

const MARGIN = 1.35;
const CACHE_KEY = 'usd_mxn_rate';
const CACHE_TTL = 60 * 60 * 1000;

function getCachedRate(): number | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { rate, ts } = JSON.parse(raw) as { rate: number; ts: number };
    if (Date.now() - ts > CACHE_TTL) return null;
    return rate;
  } catch {
    return null;
  }
}

async function fetchRate(): Promise<number> {
  const cached = getCachedRate();
  if (cached) return cached;
  try {
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    const json = await res.json() as { rates: Record<string, number> };
    const rate = json.rates?.MXN ?? 17.5;
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ rate, ts: Date.now() }));
    return rate;
  } catch {
    return 17.5;
  }
}

const mxnFmt = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 2,
});

interface PriceDisplayProps {
  usd: number;
  className?: string;
}

export function PriceDisplay({ usd, className }: PriceDisplayProps) {
  const [price, setPrice] = useState<string | null>(null);

  useEffect(() => {
    fetchRate().then((rate) => {
      setPrice(mxnFmt.format(usd * rate * MARGIN));
    });
  }, [usd]);

  if (!price) {
    return <span className={className}>Cargando...</span>;
  }

  return <span className={className}>{price}</span>;
}
