import { describe, it, expect } from "vitest";
import { computeStockDecrements, checkAvailability } from "@/lib/orders/stock";
import type { CartLine } from "@/lib/cart/types";

const v = (refId: string, qty: number): CartLine => ({
  id: refId,
  kind: "variant",
  refId,
  unitPrice: 1000,
  qty,
});

describe("computeStockDecrements", () => {
  it("acumula variantes por refId", () => {
    const m = computeStockDecrements([v("a", 2), v("b", 1), v("a", 3)]);
    expect(m.get("a")).toBe(5);
    expect(m.get("b")).toBe(1);
  });
});

describe("checkAvailability", () => {
  it("ok cuando hay stock suficiente", () => {
    const decr = new Map([
      ["a", 2],
      ["b", 1],
    ]);
    const cur = new Map([
      ["a", 5],
      ["b", 1],
    ]);
    expect(checkAvailability(decr, cur)).toEqual({ ok: true, shortages: [] });
  });
  it("reporta faltantes", () => {
    const decr = new Map([
      ["a", 3],
      ["b", 2],
    ]);
    const cur = new Map([
      ["a", 1],
      ["b", 2],
    ]);
    const r = checkAvailability(decr, cur);
    expect(r.ok).toBe(false);
    expect(r.shortages).toEqual([{ variantId: "a", needed: 3, available: 1 }]);
  });
  it("variante ausente del stock actual = 0 disponible", () => {
    const r = checkAvailability(new Map([["x", 1]]), new Map());
    expect(r.ok).toBe(false);
    expect(r.shortages[0]).toEqual({ variantId: "x", needed: 1, available: 0 });
  });
});
