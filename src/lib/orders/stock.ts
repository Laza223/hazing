import type { CartLine } from "@/lib/cart/types";

/** Cantidad a descontar por variante. */
export function computeStockDecrements(lines: CartLine[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const l of lines) m.set(l.refId, (m.get(l.refId) ?? 0) + l.qty);
  return m;
}

export interface Shortage {
  variantId: string;
  needed: number;
  available: number;
}
export interface AvailabilityResult {
  ok: boolean;
  shortages: Shortage[];
}

/** ¿Alcanza el stock actual para los decrementos pedidos? Reporta faltantes (oversell). */
export function checkAvailability(
  decrements: Map<string, number>,
  currentStock: Map<string, number>,
): AvailabilityResult {
  const shortages: Shortage[] = [];
  for (const [variantId, needed] of decrements) {
    const available = currentStock.get(variantId) ?? 0;
    if (available < needed) shortages.push({ variantId, needed, available });
  }
  return { ok: shortages.length === 0, shortages };
}
