import { describe, it, expect } from "vitest";
import {
  SIZE_SCALES,
  isValidSize,
  compareSizes,
  sortSizes,
} from "@/lib/catalog/sizes";

describe("SIZE_SCALES", () => {
  it("letters: XS a XXL", () => {
    expect(SIZE_SCALES.letters).toEqual(["XS", "S", "M", "L", "XL", "XXL"]);
  });
  it("numeric: 34 a 50", () => {
    expect(SIZE_SCALES.numeric).toEqual([
      "34",
      "36",
      "38",
      "40",
      "42",
      "44",
      "46",
      "48",
      "50",
    ]);
  });
  it("one_size: Único", () => {
    expect(SIZE_SCALES.one_size).toEqual(["Único"]);
  });
});

describe("isValidSize", () => {
  it("talle dentro de la escala del sistema → true", () => {
    expect(isValidSize("letters", "M")).toBe(true);
    expect(isValidSize("numeric", "40")).toBe(true);
    expect(isValidSize("one_size", "Único")).toBe(true);
  });
  it("talle fuera de la escala del sistema → false", () => {
    expect(isValidSize("letters", "40")).toBe(false);
    expect(isValidSize("numeric", "M")).toBe(false);
    expect(isValidSize("one_size", "M")).toBe(false);
  });
});

describe("compareSizes", () => {
  it("ordena por posición en la escala", () => {
    expect(compareSizes("letters", "S", "M")).toBeLessThan(0);
    expect(compareSizes("letters", "XL", "S")).toBeGreaterThan(0);
    expect(compareSizes("letters", "M", "M")).toBe(0);
  });
  it("ordena numéricos por posición en la escala, no alfabéticamente", () => {
    expect(compareSizes("numeric", "38", "40")).toBeLessThan(0);
    expect(compareSizes("numeric", "48", "40")).toBeGreaterThan(0);
  });
  it("talle fuera de escala va después de los que sí están en la escala", () => {
    expect(compareSizes("letters", "M", "ÚNICO-RARO")).toBeLessThan(0);
    expect(compareSizes("letters", "ÚNICO-RARO", "M")).toBeGreaterThan(0);
  });
  it("dos talles fuera de escala se ordenan alfabéticamente entre sí", () => {
    expect(compareSizes("letters", "Z-RARO", "A-RARO")).toBeGreaterThan(0);
  });
});

describe("sortSizes", () => {
  it("ordena una lista de talles letters según la escala", () => {
    expect(sortSizes("letters", ["L", "XS", "M", "S"])).toEqual([
      "XS",
      "S",
      "M",
      "L",
    ]);
  });
  it("ordena una lista de talles numeric según la escala", () => {
    expect(sortSizes("numeric", ["42", "36", "40"])).toEqual([
      "36",
      "40",
      "42",
    ]);
  });
  it("talles fuera de escala quedan al final, en orden alfabético", () => {
    expect(sortSizes("letters", ["Z-RARO", "M", "A-RARO", "S"])).toEqual([
      "S",
      "M",
      "A-RARO",
      "Z-RARO",
    ]);
  });
  it("no muta el array original", () => {
    const original = ["L", "S"];
    sortSizes("letters", original);
    expect(original).toEqual(["L", "S"]);
  });
});
