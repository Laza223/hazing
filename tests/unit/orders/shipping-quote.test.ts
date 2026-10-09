import { describe, it, expect, vi } from "vitest";
import {
  findMatchingZone,
  quoteShipping,
  type QuoteShippingDeps,
  type Zone,
} from "@/lib/shipping/quote";
import { orderWeightGr } from "@/lib/shipping/micorreo";

const provinceZone: Zone = {
  id: "z1",
  matchType: "province",
  provinces: ["Buenos Aires"],
  cpFrom: null,
  cpTo: null,
  price: 3500,
  active: true,
  order: 0,
};
const cpZone: Zone = {
  id: "z2",
  matchType: "cpRange",
  provinces: [],
  cpFrom: "1000",
  cpTo: "1499",
  price: 2500,
  active: true,
  order: 1,
};
const inactiveZone: Zone = {
  id: "z3",
  matchType: "province",
  provinces: ["Córdoba"],
  cpFrom: null,
  cpTo: null,
  price: 1000,
  active: false,
  order: 0,
};

describe("findMatchingZone", () => {
  it("matchea por provincia", () => {
    expect(findMatchingZone([provinceZone], "6700", "Buenos Aires")?.id).toBe(
      "z1",
    );
  });
  it("matchea por rango de CP", () => {
    expect(findMatchingZone([cpZone], "1200", null)?.id).toBe("z2");
    expect(findMatchingZone([cpZone], "1600", null)).toBeNull();
  });
  it("ignora zonas inactivas", () => {
    expect(findMatchingZone([inactiveZone], "5000", "Córdoba")).toBeNull();
  });
  it("sin match → null", () => {
    expect(findMatchingZone([provinceZone], "3000", "Santa Fe")).toBeNull();
  });

  it("compara CP numéricamente, no como string (900 no cae en un rango 1000-9420 mal cargado)", () => {
    // Regresión: comparar como texto hacía que "900" >= "1000" fuera true (lexicográfico),
    // matcheando un CP que en realidad está fuera del rango numérico.
    const zone: Zone = {
      id: "z4",
      matchType: "cpRange",
      provinces: [],
      cpFrom: "1000",
      cpTo: "9420",
      price: 3000,
      active: true,
      order: 0,
    };
    expect(findMatchingZone([zone], "0900", null)).toBeNull();
    expect(findMatchingZone([zone], "1000", null)?.id).toBe("z4");
    expect(findMatchingZone([zone], "9420", null)?.id).toBe("z4");
  });

  it("CP con formato inválido (no 4 dígitos) no matchea ningún rango", () => {
    const zone: Zone = {
      id: "z5",
      matchType: "cpRange",
      provinces: [],
      cpFrom: "1000",
      cpTo: "9420",
      price: 3000,
      active: true,
      order: 0,
    };
    expect(findMatchingZone([zone], "C1425DJR", null)).toBeNull();
    expect(findMatchingZone([zone], "123", null)).toBeNull();
  });
});

describe("quoteShipping", () => {
  const base = {
    method: "domicilio" as const,
    cp: "6700",
    province: "Buenos Aires",
    subtotal: 1000,
    units: 2,
  };
  const live = { cost: 5000.5, carrier: "Correo Argentino" };
  const makeDeps = (
    over: Partial<QuoteShippingDeps> = {},
  ): QuoteShippingDeps => ({
    getZones: async () => [provinceZone],
    getThreshold: async () => null,
    getSurcharge: async () => 2000,
    liveQuote: async () => live,
    weightGr: orderWeightGr,
    ...over,
  });

  it("retiro: costo 0, source pickup, sin cotizar ni aplicar umbral", async () => {
    const liveQuote = vi.fn(async () => live);
    const q = await quoteShipping(
      { ...base, method: "retiro", subtotal: 1 },
      makeDeps({ liveQuote, getThreshold: async () => 100 }),
    );
    expect(q).toEqual({
      cost: 0,
      zoneId: null,
      freeShipping: false,
      source: "pickup",
    });
    expect(liveQuote).not.toHaveBeenCalled();
  });

  it("envío gratis si el subtotal alcanza el umbral (sin cotizar)", async () => {
    const liveQuote = vi.fn(async () => live);
    const q = await quoteShipping(
      { ...base, subtotal: 50000 },
      makeDeps({ liveQuote, getThreshold: async () => 40000 }),
    );
    expect(q).toEqual({
      cost: 0,
      zoneId: null,
      freeShipping: true,
      source: "free",
    });
    expect(liveQuote).not.toHaveBeenCalled();
  });

  it("sin umbral (null) nunca da envío gratis", async () => {
    const q = await quoteShipping({ ...base, subtotal: 999999 }, makeDeps());
    expect(q.source).toBe("live");
  });

  it("vivo: cotización + recargo, redondeado a 2 decimales", async () => {
    const q = await quoteShipping(base, makeDeps());
    expect(q).toEqual({
      cost: 7000.5,
      zoneId: null,
      freeShipping: false,
      source: "live",
    });
  });

  it("vivo: pasa método, CP y peso (400 g/unidad, mínimo 500 g)", async () => {
    const liveQuote = vi.fn(async () => live);
    await quoteShipping(
      { ...base, method: "sucursal", units: 3 },
      makeDeps({ liveQuote }),
    );
    expect(liveQuote).toHaveBeenCalledWith({
      cpDestino: "6700",
      pesoGr: 1200,
      metodo: "sucursal",
    });
    await quoteShipping({ ...base, units: 1 }, makeDeps({ liveQuote }));
    expect(liveQuote).toHaveBeenLastCalledWith({
      cpDestino: "6700",
      pesoGr: 500,
      metodo: "domicilio",
    });
  });

  it("recargo 0 → solo la cotización", async () => {
    const q = await quoteShipping(
      base,
      makeDeps({ getSurcharge: async () => 0 }),
    );
    expect(q.cost).toBe(5000.5);
  });

  it("vivo null → precio de la zona tal cual, sin recargo", async () => {
    const q = await quoteShipping(
      base,
      makeDeps({ liveQuote: async () => null }),
    );
    expect(q).toEqual({
      cost: 3500,
      zoneId: "z1",
      freeShipping: false,
      source: "zone",
    });
  });

  it("vivo null y sin zona que matchee, lanza", async () => {
    await expect(
      quoteShipping(
        { ...base, cp: "9999", province: "Tierra del Fuego" },
        makeDeps({ liveQuote: async () => null }),
      ),
    ).rejects.toThrow(/Todavía no podemos calcular el envío/);
  });
});
