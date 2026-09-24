/** Utilidades de dinero: ARS, Decimal(12,2). Display en es-AR.
 * Copiado exacto de glamify-makeup/src/lib/money.ts (ver docs/spec/03-tecnica.md). */

const ARS = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const ARS_WHOLE = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function parseDecimal(value: number | string): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) {
    throw new Error(`Monto inválido: ${value}`);
  }
  return n;
}

/** Redondea a 2 decimales (half-up), corrigiendo el drift de float. Acepta string/number. */
export function round2(value: number | string): number {
  const n = parseDecimal(value);
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function formatARS(value: number | string): string {
  // Intl usa NBSP (U+00A0) / narrow NBSP (U+202F) entre símbolo y número;
  // lo normalizamos a un espacio normal para un output determinístico.
  return ARS.format(parseDecimal(value)).replace(/[  ]/g, " ");
}

/** Precio para el storefront (docs/spec/05-direccion-arte.md §3.1): un monto
 * entero se muestra sin decimales ("$ 15.000") y uno con centavos con dos
 * ("$ 15.000,50"). `formatARS` (siempre ",00") queda para emails/admin. */
export function formatPrice(value: number | string): string {
  const n = round2(value);
  const hasCents = Math.round(n * 100) % 100 !== 0;
  const formatter = hasCents ? ARS : ARS_WHOLE;
  return formatter.format(n).replace(/[  ]/g, " ");
}
