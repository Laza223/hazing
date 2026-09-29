import { describe, expect, it } from "vitest";
import {
  getNationwideShippingPrice,
  setNationwideShippingPrice,
  NATIONWIDE_ZONE_ORDER,
  type NationwideZoneDb,
} from "@/lib/admin/shipping-zone";
import { findMatchingZone } from "@/lib/shipping/quote";

function fakeDb(
  existing: { id: string; price: number; active: boolean } | null,
) {
  const calls: Array<{ op: string; args: unknown }> = [];
  const db: NationwideZoneDb = {
    shippingZone: {
      findFirst: async () => existing,
      create: async (args) => {
        calls.push({ op: "create", args });
      },
      update: async (args) => {
        calls.push({ op: "update", args });
      },
    },
  };
  return { db, calls };
}

describe("zona provisoria Todo el país", () => {
  it("sin zona previa, la crea cubriendo todos los CP con order alto", async () => {
    const { db, calls } = fakeDb(null);
    await setNationwideShippingPrice(6500, db);
    expect(calls).toHaveLength(1);
    const data = (calls[0]!.args as { data: Record<string, unknown> }).data;
    expect(data).toMatchObject({
      matchType: "cpRange",
      cpFrom: "1000",
      cpTo: "9999",
      price: 6500,
      active: true,
      order: NATIONWIDE_ZONE_ORDER,
    });
    // La zona que crea cotiza cualquier CP argentino de 4 dígitos.
    const zone = {
      id: "z",
      matchType: "cpRange" as const,
      provinces: [],
      cpFrom: "1000",
      cpTo: "9999",
      price: 6500,
      active: true,
      order: NATIONWIDE_ZONE_ORDER,
    };
    expect(findMatchingZone([zone], "6700", null)).not.toBeNull();
    expect(findMatchingZone([zone], "1000", null)).not.toBeNull();
    expect(findMatchingZone([zone], "9999", null)).not.toBeNull();
  });

  it("con zona previa, actualiza precio y la reactiva", async () => {
    const { db, calls } = fakeDb({ id: "z1", price: 1, active: false });
    await setNationwideShippingPrice(7000, db);
    expect(calls).toEqual([
      {
        op: "update",
        args: { where: { id: "z1" }, data: { price: 7000, active: true } },
      },
    ]);
  });

  it("precio null apaga la zona; sin zona no hace nada", async () => {
    const a = fakeDb({ id: "z1", price: 1, active: true });
    await setNationwideShippingPrice(null, a.db);
    expect(a.calls).toEqual([
      { op: "update", args: { where: { id: "z1" }, data: { active: false } } },
    ]);
    const b = fakeDb(null);
    await setNationwideShippingPrice(null, b.db);
    expect(b.calls).toEqual([]);
  });

  it("una zona por provincia con order menor le gana a la de todo el país", () => {
    const provincia = {
      id: "p",
      matchType: "province" as const,
      provinces: ["Buenos Aires"],
      cpFrom: null,
      cpTo: null,
      price: 3000,
      active: true,
      order: 1,
    };
    const pais = {
      id: "n",
      matchType: "cpRange" as const,
      provinces: [],
      cpFrom: "1000",
      cpTo: "9999",
      price: 6500,
      active: true,
      order: NATIONWIDE_ZONE_ORDER,
    };
    expect(
      findMatchingZone([pais, provincia], "6700", "Buenos Aires")?.id,
    ).toBe("p");
  });

  it("getNationwideShippingPrice: null si no existe o está apagada", async () => {
    expect(await getNationwideShippingPrice(fakeDb(null).db)).toBeNull();
    expect(
      await getNationwideShippingPrice(
        fakeDb({ id: "z", price: 5, active: false }).db,
      ),
    ).toBeNull();
    expect(
      await getNationwideShippingPrice(
        fakeDb({ id: "z", price: 5, active: true }).db,
      ),
    ).toBe(5);
  });
});
