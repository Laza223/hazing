import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/catalog/pricing";
import type { Zone } from "@/lib/shipping/quote";

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
