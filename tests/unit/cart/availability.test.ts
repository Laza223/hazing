import { describe, expect, it } from "vitest";
import { unavailableLines } from "@/lib/cart/availability";

const line = (over: {
  qty?: number;
  active?: boolean;
  stock?: number;
  productActive?: boolean;
  deletedAt?: Date | null;
}) => ({
  qty: over.qty ?? 1,
  variant: {
    active: over.active ?? true,
    stock: over.stock ?? 5,
    product: {
      active: over.productActive ?? true,
      deletedAt: over.deletedAt ?? null,
    },
  },
});

describe("unavailableLines", () => {
  it("una línea vigente con stock pasa", () => {
    expect(unavailableLines([line({})])).toEqual([]);
  });

  it("variante desactivada, producto desactivado o borrado → no disponible", () => {
    const lines = [
      line({ active: false }),
      line({ productActive: false }),
      line({ deletedAt: new Date() }),
    ];
    expect(unavailableLines(lines)).toHaveLength(3);
  });

  it("stock menor a la cantidad pedida → no disponible; igual → disponible", () => {
    expect(unavailableLines([line({ qty: 3, stock: 2 })])).toHaveLength(1);
    expect(unavailableLines([line({ qty: 2, stock: 2 })])).toHaveLength(0);
  });
});
