import { describe, it, expect, vi } from "vitest";
import { Prisma } from "@prisma/client";
import {
  increasePrice,
  validatePercent,
  previewPriceIncrease,
  applyPriceIncrease,
  type BulkPriceDb,
} from "@/lib/admin/products/bulk-price";

function makeDb(over: Partial<{ count: number; top: number | null }> = {}) {
  const executeRaw = vi.fn(async () => 3);
  const db = {
    $executeRaw: executeRaw,
    $transaction: vi.fn(async (qs: Array<Promise<number>>) => Promise.all(qs)),
    category: {
      findMany: vi.fn(async () => [{ id: "child-1" }]),
    },
    product: {
      count: vi.fn(async () => over.count ?? 137),
      findFirst: vi.fn(async () =>
        over.top === null
          ? null
          : { basePrice: new Prisma.Decimal(over.top ?? 35000) },
      ),
    },
  } as unknown as BulkPriceDb;
  return { db, executeRaw };
}

describe("increasePrice", () => {
  it("sube el % y redondea al $100", () => {
    expect(increasePrice(10000, 35)).toBe(13500);
    expect(increasePrice(14000, 35)).toBe(18900);
    expect(increasePrice(9200, 35)).toBe(12400);
    expect(increasePrice(16100, 10)).toBe(17700);
  });

  it("redondea hacia arriba en el punto medio", () => {
    expect(increasePrice(10050, 0.5)).toBe(10100);
  });

  it("nunca baja un precio ni lo deja en $0", () => {
    expect(increasePrice(40, 10)).toBe(40);
    expect(increasePrice(1, 10)).toBe(1);
    expect(increasePrice(10030, 0.1)).toBe(10030);
  });

  it("acepta porcentajes decimales", () => {
    expect(increasePrice(10000, 12.5)).toBe(11300);
  });
});

describe("validatePercent", () => {
  it.each([0, 0.05, -5, 101, NaN, Infinity])("rechaza %s", (p) => {
    expect(validatePercent(p).ok).toBe(false);
  });
  it.each([0.1, 15, 35, 100])("acepta %s", (p) => {
    expect(validatePercent(p).ok).toBe(true);
  });
});

describe("previewPriceIncrease", () => {
  it("devuelve cantidad y ejemplo con el producto más caro", async () => {
    const { db } = makeDb();
    const r = await previewPriceIncrease({ percent: 20 }, { db });
    expect(r).toEqual({ products: 137, example: { from: 35000, to: 42000 } });
  });

  it("sin productos no hay ejemplo", async () => {
    const { db } = makeDb({ count: 0, top: null });
    const r = await previewPriceIncrease({ percent: 20 }, { db });
    expect(r).toEqual({ products: 0, example: null });
  });

  it("filtra por categoría y sus hijas, y excluye borrados", async () => {
    const { db } = makeDb();
    await previewPriceIncrease({ percent: 20, categoryId: "cat-1" }, { db });
    expect(db.product.count).toHaveBeenCalledWith({
      where: { deletedAt: null, categoryId: { in: ["cat-1", "child-1"] } },
    });
  });
});

describe("applyPriceIncrease", () => {
  it("rechaza un % inválido sin tocar la base", async () => {
    const { db, executeRaw } = makeDb();
    await expect(applyPriceIncrease({ percent: 0 }, { db })).rejects.toThrow();
    expect(executeRaw).not.toHaveBeenCalled();
  });

  it("corre productos y variantes en una sola transacción, sin tocar cost", async () => {
    const { db, executeRaw } = makeDb();
    const r = await applyPriceIncrease({ percent: 35 }, { db });
    expect(r).toEqual({ products: 3 });
    expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(executeRaw).toHaveBeenCalledTimes(2);
    const [product, variant] = executeRaw.mock.calls.map(
      (c) => (c as unknown as [Prisma.Sql])[0].sql,
    );
    expect(product).toContain('UPDATE "Product"');
    expect(product).toContain('"deletedAt" IS NULL');
    expect(product).not.toContain('"cost"');
    expect(variant).toContain('"priceOverride"');
  });

  it("limita a la categoría pedida", async () => {
    const { db, executeRaw } = makeDb();
    await applyPriceIncrease({ percent: 10, categoryId: "cat-1" }, { db });
    for (const c of executeRaw.mock.calls) {
      const q = (c as unknown as [Prisma.Sql])[0];
      expect(q.sql).toContain('"categoryId"');
      expect(q.values).toContainEqual(["cat-1", "child-1"]);
    }
  });
});
