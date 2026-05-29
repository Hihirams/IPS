/**
 * Conversión USD → MXN con tasa live + 35% de margen.
 * Fuente: exchangerate-api.com (plan gratuito, se cachea 1h en memoria).
 */

const MARGIN = 1.35;
const CACHE_TTL = 60 * 60 * 1000; // 1 hora

let cachedRate: number | null = null;
let cacheTs = 0;

export async function getUsdToMxnRate(): Promise<number> {
  const now = Date.now();
  if (cachedRate !== null && now - cacheTs < CACHE_TTL) return cachedRate;

  try {
    const res = await fetch(
      'https://api.exchangerate-api.com/v4/latest/USD',
      { next: { revalidate: 3600 } }
    );
    const json = await res.json() as { rates: Record<string, number> };
    const rate = json.rates?.MXN ?? 17.5;
    cachedRate = rate;
    cacheTs = now;
    return rate;
  } catch {
    // Fallback si falla la API
    return cachedRate ?? 17.5;
  }
}

/**
 * Convierte precio USD → MXN con 35% de margen.
 * Usar en Server Components.
 */
export async function usdToMxn(usd: number): Promise<number> {
  const rate = await getUsdToMxnRate();
  return usd * rate * MARGIN;
}

/**
 * Formateador MXN.
 */
const mxnFmt = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 2,
});

export function formatMxn(amount: number): string {
  return mxnFmt.format(amount);
}

/**
 * Convierte y formatea en un paso (para Server Components).
 */
export async function formatPriceMxn(usd: number): Promise<string> {
  const mxn = await usdToMxn(usd);
  return formatMxn(mxn);
}
