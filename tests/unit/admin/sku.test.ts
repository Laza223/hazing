import { describe, it, expect } from "vitest";
import {
  isValidSkuPrefix,
  nextSkuSequence,
  generateSku,
} from "@/lib/admin/sku";

describe("isValidSkuPrefix", () => {
  it("acepta 1 a 3 letras A-Z mayúsculas", () => {
    expect(isValidSkuPrefix("V")).toBe(true);
    expect(isValidSkuPrefix("VE")).toBe(true);
    expect(isValidSkuPrefix("VES")).toBe(true);
  });

  it("rechaza minúsculas, números, vacío y más de 3 letras", () => {
    expect(isValidSkuPrefix("ves")).toBe(false);
    expect(isValidSkuPrefix("VE1")).toBe(false);
    expect(isValidSkuPrefix("")).toBe(false);
    expect(isValidSkuPrefix("VEST")).toBe(false);
    expect(isValidSkuPrefix("V-S")).toBe(false);
  });
});

describe("nextSkuSequence", () => {
  it("devuelve 1 cuando no hay SKUs", () => {
    expect(nextSkuSequence([])).toBe(1);
  });

  it("devuelve el máximo número final + 1", () => {
    expect(nextSkuSequence(["VES-0001", "VES-0002", "VES-0003"])).toBe(4);
    expect(nextSkuSequence(["VES-0007"])).toBe(8);
  });

  it("usa el máximo aunque vengan desordenados o de distinto prefijo", () => {
    expect(nextSkuSequence(["PAN-0010", "VES-0002", "VES-0009"])).toBe(11);
  });

  it("ignora SKUs malformados o sin número final", () => {
    expect(
      nextSkuSequence(["VES-0002", "roto", "VES-", "SIN-NUMERO", "VES-0005"]),
    ).toBe(6);
  });

  it("ignora todos los malformados y cae a 1", () => {
    expect(nextSkuSequence(["roto", "tambien-roto"])).toBe(1);
  });

  it("toma SKUs con 5+ dígitos", () => {
    expect(nextSkuSequence(["CAM-12345"])).toBe(12346);
  });
});

describe("generateSku (re-export)", () => {
  it("queda disponible desde el módulo admin/sku", () => {
    expect(generateSku("VES", nextSkuSequence(["VES-0006"]))).toBe("VES-0007");
  });
});
