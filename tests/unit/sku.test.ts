import { describe, it, expect } from "vitest";
import { generateSku, isValidSku } from "@/lib/sku";

describe("generateSku", () => {
  it("formatea prefijo + secuencia con padding a 4 dígitos", () => {
    expect(generateSku("VES", 7)).toBe("VES-0007");
    expect(generateSku("PAN", 3)).toBe("PAN-0003");
  });

  it("normaliza el prefijo a 3 letras mayúsculas", () => {
    expect(generateSku("ves", 1)).toBe("VES-0001");
    expect(generateSku("Ve", 1)).toBe("VE-0001");
    expect(generateSku("vestido", 12)).toBe("VES-0012");
  });

  it("no rompe el padding si la secuencia tiene 4+ dígitos", () => {
    expect(generateSku("CAM", 1234)).toBe("CAM-1234");
    expect(generateSku("CAM", 12345)).toBe("CAM-12345");
  });

  it("rechaza secuencias inválidas", () => {
    expect(() => generateSku("VES", 0)).toThrow();
    expect(() => generateSku("VES", -1)).toThrow();
    expect(() => generateSku("VES", 1.5)).toThrow();
  });

  it("rechaza prefijos no alfabéticos o vacíos", () => {
    expect(() => generateSku("", 1)).toThrow();
    expect(() => generateSku("V1", 1)).toThrow();
  });
});

describe("isValidSku", () => {
  it("valida el formato PREFIJO-NNNN", () => {
    expect(isValidSku("VES-0007")).toBe(true);
    expect(isValidSku("CAM-12345")).toBe(true);
    expect(isValidSku("ves-0007")).toBe(false);
    expect(isValidSku("VES-12")).toBe(false);
    expect(isValidSku("VES0007")).toBe(false);
  });
});
