import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/catalog/pricing";
import type { QuoteShippingDeps, Zone } from "@/lib/shipping/quote";
import { quoteMicorreo, orderWeightGr } from "@/lib/shipping/micorreo";

export async function getShippingZonesForQuote(): Promise<Zone[]> {
  const zones = await prisma.shippingZone.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
  });
  return zones.map((z) => ({
    id: z.id,
    matchType: z.matchType,
    provinces: z.provinces,
    cpFrom: z.cpFrom,
    cpTo: z.cpTo,
    price: toNumber(z.price),
    active: z.active,
    order: z.order,
  }));
}

/** null = todavía sin umbral definido (ver docs/spec/01-negocio.md, decisión pendiente #9). */
export async function getFreeShippingThreshold(): Promise<number | null> {
  const setting = await prisma.setting.findUnique({ where: { id: "default" } });
  return setting?.freeShippingThreshold != null
    ? toNumber(setting.freeShippingThreshold)
    : null;
}

/** Recargo default si la tabla Setting todavía no tiene fila (ver schema.prisma). */
const DEFAULT_SURCHARGE = 2000;

export async function getShippingSurcharge(): Promise<number> {
  const setting = await prisma.setting.findUnique({ where: { id: "default" } });
  return setting ? toNumber(setting.shippingSurcharge) : DEFAULT_SURCHARGE;
}

/** Dependencias reales del orquestador de envío (Correo en vivo + Setting + zonas). */
export const shippingQuoteDeps: QuoteShippingDeps = {
  getZones: getShippingZonesForQuote,
  getThreshold: getFreeShippingThreshold,
  getSurcharge: getShippingSurcharge,
  liveQuote: (input) => quoteMicorreo(input),
  weightGr: orderWeightGr,
};
