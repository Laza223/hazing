/**
 * Cotización de envío — 100% manual, sin API de courier (delta vs. glamify, ver
 * docs/spec/00-handoff.md §2.2). `ShippingZone` es la ÚNICA fuente de costo: costo
 * fijo por provincia o rango de CP, configurado a mano por la dueña en el admin.
 * No hay cotización en vivo ni fallback — si no hay zona que matchee, el checkout
 * debe fallar explícitamente (mejor eso que cobrar de más o de menos).
 */

export interface Zone {
  id: string;
  matchType: "province" | "cpRange";
  provinces: string[];
  cpFrom: string | null;
  cpTo: string | null;
  price: number;
  active: boolean;
  order: number;
}

export interface ShippingQuoteInput {
  cp: string;
  province: string | null;
  subtotal: number;
}

export interface ShippingQuote {
  cost: number;
  zoneId: string;
  freeShipping: boolean;
}

export interface QuoteShippingDeps {
  getZones: () => Promise<Zone[]>;
  /** null = sin umbral de envío gratis configurado todavía (ver docs/spec/01-negocio.md, decisión #9). */
  getThreshold: () => Promise<number | null>;
}

/** CP argentino clásico: 4 dígitos (1000-9420). El CPA alfanumérico (ej. C1425DJR) NO está
 *  soportado — REQUIRE INPUT abierto si Hazing necesita aceptarlo más adelante (ver
 *  docs/spec/01-negocio.md). `null` = CP fuera de ese formato — no matchea ninguna zona por
 *  rango en vez de comparar como texto (que rompía en pares como "900" vs "1000": "900" >
 *  "1000" lexicográficamente, aunque 900 < 1000 numéricamente). */
function parseCp(cp: string): number | null {
  return /^\d{4}$/.test(cp.trim()) ? Number(cp) : null;
}

function matchesZone(zone: Zone, cp: string, province: string | null): boolean {
  if (zone.matchType === "province")
    return province != null && zone.provinces.includes(province);
  if (zone.cpFrom == null || zone.cpTo == null) return false;
  const cpNum = parseCp(cp);
  const fromNum = parseCp(zone.cpFrom);
  const toNum = parseCp(zone.cpTo);
  if (cpNum == null || fromNum == null || toNum == null) return false;
  return cpNum >= fromNum && cpNum <= toNum;
}

/** Elige la primera zona activa (por `order`) que matchea el CP/provincia. */
export function findMatchingZone(
  zones: Zone[],
  cp: string,
  province: string | null,
): Zone | null {
  const active = zones
    .filter((z) => z.active)
    .sort((a, b) => a.order - b.order);
  return active.find((z) => matchesZone(z, cp, province)) ?? null;
}

export async function quoteShipping(
  input: ShippingQuoteInput,
  deps: QuoteShippingDeps,
): Promise<ShippingQuote> {
  const zones = await deps.getZones();
  const zone = findMatchingZone(zones, input.cp, input.province);
  if (!zone) {
    throw new Error(
      `Sin zona de envío configurada para CP ${input.cp}${input.province ? ` (${input.province})` : ""}. Cargala en el admin antes de vender ahí.`,
    );
  }
  const threshold = await deps.getThreshold();
  const freeShipping = threshold != null && input.subtotal >= threshold;
  return { cost: freeShipping ? 0 : zone.price, zoneId: zone.id, freeShipping };
}
