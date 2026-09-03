import { describe, it, expect } from "vitest";
import {
  findMatchingZone,
  quoteShipping,
  type Zone,
} from "@/lib/shipping/quote";

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
  const deps = (zones: Zone[], threshold: number | null) => ({
    getZones: async () => zones,
    getThreshold: async () => threshold,
  });

  it("cobra el precio de la zona que matchea", async () => {
    const q = await quoteShipping(
      { cp: "6700", province: "Buenos Aires", subtotal: 1000 },
      deps([provinceZone], null),
    );
    expect(q).toEqual({ cost: 3500, zoneId: "z1", freeShipping: false });
  });
  it("envío gratis si el subtotal alcanza el umbral", async () => {
    const q = await quoteShipping(
      { cp: "6700", province: "Buenos Aires", subtotal: 50000 },
      deps([provinceZone], 40000),
    );
    expect(q).toEqual({ cost: 0, zoneId: "z1", freeShipping: true });
  });
  it("sin umbral configurado (null) nunca da envío gratis", async () => {
    const q = await quoteShipping(
      { cp: "6700", province: "Buenos Aires", subtotal: 999999 },
      deps([provinceZone], null),
    );
    expect(q.freeShipping).toBe(false);
  });
  it("sin zona que matchee, lanza", async () => {
    await expect(
      quoteShipping(
        { cp: "9999", province: "Tierra del Fuego", subtotal: 1000 },
        deps([provinceZone], null),
      ),
    ).rejects.toThrow(/Sin zona de envío/);
  });
});
