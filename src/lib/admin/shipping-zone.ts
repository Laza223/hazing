/**
 * PROVISORIO — envío de un solo precio para todo el país.
 *
 * Deja que el checkout cotice mientras el envío se rehace bien en una sesión
 * dedicada (ADR 0004: MiCorreo en vivo + zonas por provincia, `weightGr`). Ver
 * docs/spec/09-envios.md. Mantiene UNA `ShippingZone` "Todo el país" (CP
 * 1000–9999) con `order` alto: cualquier zona por provincia/rango que se cargue
 * después, con `order` menor, le gana.
 */
export const NATIONWIDE_ZONE_NAME = "Todo el país";
export const NATIONWIDE_ZONE_ORDER = 999;

export interface NationwideZoneDb {
  shippingZone: {
    findFirst: (args: {
      where: { name: string };
    }) => Promise<{ id: string; price: unknown; active: boolean } | null>;
    create: (args: {
      data: {
        name: string;
        matchType: "cpRange";
        provinces: string[];
        cpFrom: string;
        cpTo: string;
        price: number;
        active: boolean;
        order: number;
      };
    }) => Promise<unknown>;
    update: (args: {
      where: { id: string };
      data: { price?: number; active: boolean };
    }) => Promise<unknown>;
  };
}

/** Precio actual de la zona "Todo el país" (null si no existe o está apagada). */
export async function getNationwideShippingPrice(
  db: NationwideZoneDb,
): Promise<number | null> {
  const zone = await db.shippingZone.findFirst({
    where: { name: NATIONWIDE_ZONE_NAME },
  });
  return zone && zone.active ? Number(zone.price) : null;
}

/** `price` null = apagar la zona (el checkout deja de cotizar y no se puede pagar). */
export async function setNationwideShippingPrice(
  price: number | null,
  db: NationwideZoneDb,
): Promise<void> {
  const zone = await db.shippingZone.findFirst({
    where: { name: NATIONWIDE_ZONE_NAME },
  });
  if (price == null) {
    if (zone)
      await db.shippingZone.update({
        where: { id: zone.id },
        data: { active: false },
      });
    return;
  }
  if (zone) {
    await db.shippingZone.update({
      where: { id: zone.id },
      data: { price, active: true },
    });
    return;
  }
  await db.shippingZone.create({
    data: {
      name: NATIONWIDE_ZONE_NAME,
      matchType: "cpRange",
      provinces: [],
      cpFrom: "1000",
      cpTo: "9999",
      price,
      active: true,
      order: NATIONWIDE_ZONE_ORDER,
    },
  });
}
