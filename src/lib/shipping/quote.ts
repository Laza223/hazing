/**
 * Cotización de envío (ADR 0004). Orquesta: retiro en Luján (0) → envío gratis por umbral
 * → cotización en vivo de Correo Argentino + recargo fijo → precio de respaldo de
 * `ShippingZone` (solo si Correo no responde). El precio es solo para cobrar: el
 * despacho real es manual. Si nada aplica, tira error y el checkout no deja pagar.
 */
import { round2 } from "@/lib/money";

export type ShippingMethodInput = "domicilio" | "sucursal" | "retiro";

/** Opción ganadora de un proveedor de cotización en vivo. */
export interface LiveQuote {
  /** Precio en ARS (con impuestos) que cobra el courier. */
  cost: number;
  carrier: string;
}

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
  method: ShippingMethodInput;
  cp: string;
  province: string | null;
  subtotal: number;
  /** Unidades totales del carrito (define el peso a cotizar). */
  units: number;
}

export interface ShippingQuote {
  cost: number;
  zoneId: string | null;
  freeShipping: boolean;
  source: "pickup" | "free" | "live" | "zone";
}

export interface QuoteShippingDeps {
  getZones: () => Promise<Zone[]>;
  /** null = sin umbral de envío gratis configurado (ver docs/spec/01-negocio.md, decisión #9). */
  getThreshold: () => Promise<number | null>;
  /** Recargo fijo sobre la cotización en vivo. */
  getSurcharge: () => Promise<number>;
  /** Cotización en vivo; null = no disponible (sin credenciales, timeout, error). */
  liveQuote: (input: {
    cpDestino: string;
    pesoGr: number;
    metodo: "domicilio" | "sucursal";
  }) => Promise<LiveQuote | null>;
  /** Peso en gramos para N unidades. */
  weightGr: (units: number) => number;
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
  if (input.method === "retiro") {
    return { cost: 0, zoneId: null, freeShipping: false, source: "pickup" };
  }

  const threshold = await deps.getThreshold();
  if (threshold != null && input.subtotal >= threshold) {
    return { cost: 0, zoneId: null, freeShipping: true, source: "free" };
  }

  const live = await deps.liveQuote({
    cpDestino: input.cp,
    pesoGr: deps.weightGr(input.units),
    metodo: input.method,
  });
  if (live) {
    const surcharge = await deps.getSurcharge();
    return {
      cost: round2(live.cost + surcharge),
      zoneId: null,
      freeShipping: false,
      source: "live",
    };
  }

  // Respaldo: precio de la zona tal cual, sin recargo ni factor.
  const zone = findMatchingZone(
    await deps.getZones(),
    input.cp,
    input.province,
  );
  if (!zone) {
    throw new Error(
      // La ve la clienta (createCheckoutAction devuelve el mensaje tal cual).
      "Todavía no podemos calcular el envío a ese código postal. Elegí retiro en Luján o escribinos y lo resolvemos.",
    );
  }
  return {
    cost: round2(zone.price),
    zoneId: zone.id,
    freeShipping: false,
    source: "zone",
  };
}
