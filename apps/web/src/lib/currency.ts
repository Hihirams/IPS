/**
 * Utilidades de formato de moneda MXN.
 *
 * Los precios en la DB ya están en MXN con 35% de margen aplicado
 * durante el sync de productos desde Syscom. Estas funciones solo
 * formatean el número para mostrar.
 */

const mxnFmt = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 2,
});

/**
 * Formatea un monto en MXN.
 */
export function formatMxn(amount: number): string {
  return mxnFmt.format(amount);
}

/**
 * Formatea precio para Server Components.
 * El precio ya viene en MXN desde la DB (con margen aplicado en sync).
 */
export async function formatPriceMxn(mxnPrice: number): Promise<string> {
  return formatMxn(mxnPrice);
}
