import { describe, it, expect } from "vitest";
import { getPageItems } from "@/lib/catalog/pagination";

describe("getPageItems", () => {
  it("hasta 7 páginas muestra todas", () => {
    expect(getPageItems(1, 1)).toEqual([1]);
    expect(getPageItems(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("al principio: 1 2 3 4 5 … N", () => {
    expect(getPageItems(1, 30)).toEqual([1, 2, 3, 4, 5, "gap", 30]);
    expect(getPageItems(4, 30)).toEqual([1, 2, 3, 4, 5, "gap", 30]);
  });

  it("en el medio: 1 … p-1 p p+1 … N", () => {
    expect(getPageItems(5, 30)).toEqual([1, "gap", 4, 5, 6, "gap", 30]);
    expect(getPageItems(15, 30)).toEqual([1, "gap", 14, 15, 16, "gap", 30]);
  });

  it("al final: 1 … N-4 … N", () => {
    expect(getPageItems(27, 30)).toEqual([1, "gap", 26, 27, 28, 29, 30]);
    expect(getPageItems(30, 30)).toEqual([1, "gap", 26, 27, 28, 29, 30]);
  });

  it("con 8 páginas siempre incluye primera y última", () => {
    for (let p = 1; p <= 8; p++) {
      const items = getPageItems(p, 8);
      expect(items[0]).toBe(1);
      expect(items.at(-1)).toBe(8);
      expect(items).toContain(p);
    }
  });
});
