import { describe, it, expect } from "vitest";
import { parseDecimal, round2, formatARS, formatPrice } from "@/lib/money";

describe("parseDecimal", () => {
  it("acepta number y string numérico", () => {
    expect(parseDecimal(1500)).toBe(1500);
    expect(parseDecimal("1500.50")).toBe(1500.5);
  });
  it("rechaza valores no finitos", () => {
    expect(() => parseDecimal("abc")).toThrow(/Monto inválido/);
    expect(() => parseDecimal(NaN)).toThrow(/Monto inválido/);
  });
});

describe("round2", () => {
  it("redondea corrigiendo drift de float", () => {
    expect(round2(1.005)).toBe(1.01);
    expect(round2("19999.999")).toBe(20000);
  });
});

describe("formatARS", () => {
  it("formatea con símbolo de moneda y 2 decimales", () => {
    expect(formatARS(1500)).toBe("$ 1.500,00");
    expect(formatARS("47500")).toBe("$ 47.500,00");
  });
});

describe("formatPrice", () => {
  it("monto entero: sin decimales", () => {
    expect(formatPrice(15000)).toBe("$ 15.000");
    expect(formatPrice("47500")).toBe("$ 47.500");
  });
  it("monto con centavos: dos decimales", () => {
    expect(formatPrice(15000.5)).toBe("$ 15.000,50");
    expect(formatPrice("1500.05")).toBe("$ 1.500,05");
  });
  it("redondea drift de float antes de decidir si tiene centavos", () => {
    expect(formatPrice(19999.999)).toBe("$ 20.000");
  });
});
