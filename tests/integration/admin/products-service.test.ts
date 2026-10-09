import { describe, it, expect, vi } from "vitest";
import {
  createProduct,
  updateProduct,
  softDeleteProduct,
  type CreateProductDeps,
  type ProductDb,
} from "@/lib/admin/products/service";
import type {
  ProductClean,
  VariantClean,
} from "@/lib/admin/products/validation";

const variant = (over: Partial<VariantClean> = {}): VariantClean => ({
  size: "M",
  color: "Negro",
  swatchHex: "#171717",
  sku: "",
  stock: 5,
  lowStockThreshold: 3,
  priceOverride: null,
  image: null,
  active: true,
  order: 0,
  ...over,
});

const clean = (over: Partial<ProductClean> = {}): ProductClean => ({
  name: "Vestido Lino",
  slug: "vestido-lino",
  description: "Oversize",
  categoryId: "cat-1",
  extraCategoryIds: [],
  sizeSystem: "letters",
  basePrice: 45000,
  compareAtPrice: null,
  cost: 18000,
  images: [],
  isFeatured: false,
  heroRank: null,
  tags: ["lino"],
  seoTitle: null,
  seoDescription: null,
  active: true,
  variants: [variant()],
  ...over,
});

interface FakeOpts {
  prefix?: string;
  existingSkus?: string[];
  slugTaken?: boolean;
  failCreateOnce?: boolean; // simula P2002 en la primera tx.product.create
  existingVariantIds?: string[]; // variantes que YA tiene el producto en DB (para updateProduct)
  /** Filas existentes completas (id/size/color/sku) — si viene, pisa `existingVariantIds`. */
  existingRows?: Array<{
    id: string;
    size: string;
    color: string;
    sku: string;
  }>;
  /** variantIds con referencias en CartItem (para el hallazgo de variantes referenciadas). */
  cartRefs?: string[];
  /** variantIds con referencias en OrderItem. */
  orderRefs?: string[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeDeps(opts: FakeOpts = {}): {
  deps: CreateProductDeps;
  tx: any;
  db: any;
} {
  let createCalls = 0;
  const existingRows =
    opts.existingRows ??
    (opts.existingVariantIds ?? []).map((id) => ({
      id,
      size: "M",
      color: "Negro",
      sku: `SKU-${id}`,
    }));
  const cartRefs = opts.cartRefs ?? [];
  const orderRefs = opts.orderRefs ?? [];
  const tx = {
    product: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      create: vi.fn(async ({ data }: any) => {
        createCalls += 1;
        if (opts.failCreateOnce && createCalls === 1) {
          const err = Object.assign(new Error("Unique constraint failed"), {
            code: "P2002",
          });
          throw err;
        }
        return { id: "prod-1", ...data };
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      update: vi.fn(async ({ data }: any) => ({ id: "prod-1", ...data })),
    },
    productVariant: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      findMany: vi.fn(async ({ where }: any) =>
        where.productId
          ? existingRows
          : (opts.existingSkus ?? []).map((sku) => ({ sku })),
      ),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      create: vi.fn(async ({ data }: any) => ({
        id: "new-variant-id",
        ...data,
      })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      update: vi.fn(async ({ where, data }: any) => ({
        id: where.id,
        ...data,
      })),
      deleteMany: vi.fn(async () => ({ count: 0 })),
    },
    productCategory: {
      deleteMany: vi.fn(async () => ({ count: 0 })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      createMany: vi.fn(async ({ data }: any) => ({ count: data.length })),
    },
    cartItem: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      findMany: vi.fn(async ({ where }: any) =>
        cartRefs
          .filter((vid) => where.variantId.in.includes(vid))
          .map((variantId) => ({ variantId })),
      ),
    },
    orderItem: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      findMany: vi.fn(async ({ where }: any) =>
        orderRefs
          .filter((vid) => where.variantId.in.includes(vid))
          .map((variantId) => ({ variantId })),
      ),
    },
  };
  const db = {
    category: {
      findUnique: vi.fn(async () =>
        opts.prefix ? { skuPrefix: opts.prefix } : null,
      ),
    },
    product: {
      findFirst: vi.fn(async () => (opts.slugTaken ? { id: "other" } : null)),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      update: vi.fn(async ({ data }: any) => ({ id: "prod-1", ...data })),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $transaction: vi.fn(async (fn: any) => fn(tx)),
  };
  const deps: CreateProductDeps = { db: db as unknown as ProductDb };
  return { deps, tx, db };
}

describe("createProduct", () => {
  it("crea el producto con sus variantes y SKU autogenerado por prefijo de categoría", async () => {
    const { deps, tx } = makeDeps({
      prefix: "REM",
      existingSkus: ["REM-0001", "REM-0002"],
    });
    const res = await createProduct(
      clean({
        variants: [
          variant({ size: "M", color: "Negro" }),
          variant({ size: "L", color: "Negro" }),
        ],
      }),
      deps,
    );
    expect(res.id).toBe("prod-1");
    const data = tx.product.create.mock.calls[0][0].data;
    const skus = data.variants.create.map((v: { sku: string }) => v.sku);
    expect(skus).toEqual(["REM-0003", "REM-0004"]);
    expect(data.slug).toBe("vestido-lino");
    expect(data.variants.create).toHaveLength(2);
  });

  it("deriva el name de cada variante como '{talle} · {color}'", async () => {
    const { deps, tx } = makeDeps({ prefix: "REM" });
    await createProduct(
      clean({ variants: [variant({ size: "M", color: "Negro" })] }),
      deps,
    );
    const data = tx.product.create.mock.calls[0][0].data;
    expect(data.variants.create[0].name).toBe("M · Negro");
  });

  it("ignora cualquier SKU manual del cliente: variantes nuevas SIEMPRE autogeneran (§3.6)", async () => {
    const { deps, tx } = makeDeps({
      prefix: "REM",
      existingSkus: ["REM-0005"],
    });
    await createProduct(
      clean({
        variants: [
          variant({ size: "S", color: "Negro", sku: "REM-0099" }),
          variant({ size: "M", color: "Negro", sku: "" }),
        ],
      }),
      deps,
    );
    const skus = tx.product.create.mock.calls[0][0].data.variants.create.map(
      (v: { sku: string }) => v.sku,
    );
    expect(skus).toEqual(["REM-0006", "REM-0007"]);
  });

  it("reintenta una vez ante colisión de SKU (P2002)", async () => {
    const { deps, tx } = makeDeps({
      prefix: "REM",
      existingSkus: ["REM-0001"],
      failCreateOnce: true,
    });
    const res = await createProduct(clean({ variants: [variant()] }), deps);
    expect(res.id).toBe("prod-1");
    expect(tx.product.create).toHaveBeenCalledTimes(2);
    const secondSkus =
      tx.product.create.mock.calls[1][0].data.variants.create.map(
        (v: { sku: string }) => v.sku,
      );
    expect(secondSkus[0]).toBe("REM-0002");
  });

  it("falla si el slug ya está tomado", async () => {
    const { deps } = makeDeps({ prefix: "REM", slugTaken: true });
    await expect(createProduct(clean(), deps)).rejects.toThrow(/enlace|slug/i);
  });

  it("falla si la categoría no existe", async () => {
    const { deps } = makeDeps({ prefix: undefined });
    await expect(createProduct(clean(), deps)).rejects.toThrow(/categor/i);
  });

  it("crea las categorías adicionales junto con el producto", async () => {
    const { deps, tx } = makeDeps({ prefix: "REM" });
    await createProduct(
      clean({ extraCategoryIds: ["cat-gift", "cat-box"] }),
      deps,
    );
    expect(tx.productCategory.deleteMany).toHaveBeenCalledWith({
      where: { productId: "prod-1" },
    });
    expect(tx.productCategory.createMany).toHaveBeenCalledWith({
      data: [
        { productId: "prod-1", categoryId: "cat-gift" },
        { productId: "prod-1", categoryId: "cat-box" },
      ],
    });
  });

  it("sin categorías adicionales, no llama createMany", async () => {
    const { deps, tx } = makeDeps({ prefix: "REM" });
    await createProduct(clean({ extraCategoryIds: [] }), deps);
    expect(tx.productCategory.createMany).not.toHaveBeenCalled();
  });
});

describe("updateProduct", () => {
  it("actualiza una variante existente in-place (conserva su SKU/id, no la borra ni la recrea)", async () => {
    const { deps, tx } = makeDeps({
      prefix: "REM",
      existingSkus: ["REM-0001"],
      existingVariantIds: ["v1"],
    });
    const res = await updateProduct(
      "prod-1",
      clean({
        variants: [
          variant({
            id: "v1",
            size: "M",
            color: "Negro",
            sku: "REM-0001",
            stock: 9,
          }),
        ],
      }),
      deps,
    );
    expect(res.id).toBe("prod-1");
    expect(tx.productVariant.update).toHaveBeenCalledWith({
      where: { id: "v1" },
      data: expect.objectContaining({ stock: 9, sku: "REM-0001" }),
    });
    expect(tx.productVariant.create).not.toHaveBeenCalled();
    expect(tx.productVariant.deleteMany).not.toHaveBeenCalled();
  });

  describe("stock con baseStock (no pisar ventas concurrentes)", () => {
    const run = async (v: Partial<VariantClean>) => {
      const { deps, tx } = makeDeps({
        prefix: "REM",
        existingSkus: ["REM-0001"],
        existingVariantIds: ["v1"],
      });
      await updateProduct(
        "prod-1",
        clean({
          variants: [variant({ id: "v1", sku: "REM-0001", ...v })],
        }),
        deps,
      );
      return tx.productVariant.update.mock.calls[0][0] as {
        data: Record<string, unknown>;
      };
    };

    it("aplica la diferencia con increment (form cargado con 10, Dana pone 15, hubo ventas)", async () => {
      const call = await run({ baseStock: 10, stock: 15 });
      expect(call.data.stock).toEqual({ increment: 5 });
    });

    it("diferencia negativa → increment negativo", async () => {
      const call = await run({ baseStock: 10, stock: 4 });
      expect(call.data.stock).toEqual({ increment: -6 });
    });

    it("si el stock no cambió, no toca el stock (conserva las ventas)", async () => {
      const call = await run({ baseStock: 10, stock: 10 });
      expect("stock" in call.data).toBe(false);
      expect(call.data.sku).toBe("REM-0001");
    });

    it("stock negativo sin cambios no se toca", async () => {
      const call = await run({ baseStock: -2, stock: -2 });
      expect("stock" in call.data).toBe(false);
    });

    it("sin baseStock mantiene el set absoluto", async () => {
      const call = await run({ stock: 7 });
      expect(call.data.stock).toBe(7);
    });
  });

  it("crea una variante nueva (sin id) sin tocar las existentes", async () => {
    const { deps, tx } = makeDeps({
      prefix: "REM",
      existingSkus: ["REM-0001"],
      existingVariantIds: ["v1"],
    });
    await updateProduct(
      "prod-1",
      clean({
        variants: [
          variant({ id: "v1", size: "M", color: "Negro" }),
          variant({ size: "L", color: "Blanco", sku: "" }),
        ],
      }),
      deps,
    );
    expect(tx.productVariant.update).toHaveBeenCalledWith({
      where: { id: "v1" },
      data: expect.objectContaining({ size: "M", color: "Negro" }),
    });
    expect(tx.productVariant.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        size: "L",
        color: "Blanco",
        productId: "prod-1",
      }),
    });
    expect(tx.productVariant.deleteMany).not.toHaveBeenCalled();
  });

  it("borra una variante que ya no viene en el form (talle/color destildado)", async () => {
    const { deps, tx } = makeDeps({
      prefix: "REM",
      existingSkus: ["REM-0001"],
      existingVariantIds: ["v1", "v2"],
    });
    await updateProduct(
      "prod-1",
      clean({ variants: [variant({ id: "v1" })] }),
      deps,
    ); // v2 ya no viene
    expect(tx.productVariant.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["v2"] } },
    });
  });

  it("desactiva (no borra) una variante destildada que está en un carrito", async () => {
    const { deps, tx } = makeDeps({
      prefix: "REM",
      existingSkus: ["REM-0001"],
      existingVariantIds: ["v1", "v2"],
      cartRefs: ["v2"],
    });
    await updateProduct(
      "prod-1",
      clean({ variants: [variant({ id: "v1" })] }),
      deps,
    ); // v2 ya no viene y tiene una línea de carrito
    expect(tx.productVariant.deleteMany).not.toHaveBeenCalled();
    expect(tx.productVariant.update).toHaveBeenCalledWith({
      where: { id: "v2" },
      data: { active: false, stock: 0 },
    });
  });

  it("desactiva (no borra) una variante destildada que está en un pedido", async () => {
    const { deps, tx } = makeDeps({
      prefix: "REM",
      existingSkus: ["REM-0001"],
      existingVariantIds: ["v1", "v2"],
      orderRefs: ["v2"],
    });
    await updateProduct(
      "prod-1",
      clean({ variants: [variant({ id: "v1" })] }),
      deps,
    );
    expect(tx.productVariant.deleteMany).not.toHaveBeenCalled();
    expect(tx.productVariant.update).toHaveBeenCalledWith({
      where: { id: "v2" },
      data: { active: false, stock: 0 },
    });
  });

  it("borra la variante destildada que NO tiene referencias, y no toca las referenciadas", async () => {
    const { deps, tx } = makeDeps({
      prefix: "REM",
      existingSkus: ["REM-0001"],
      existingVariantIds: ["v1", "v2", "v3"],
      cartRefs: ["v3"],
    });
    await updateProduct(
      "prod-1",
      clean({ variants: [variant({ id: "v1" })] }),
      deps,
    ); // v2 (sin referencias) y v3 (con carrito) salen de la grilla
    expect(tx.productVariant.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["v2"] } },
    });
    expect(tx.productVariant.update).toHaveBeenCalledWith({
      where: { id: "v3" },
      data: { active: false, stock: 0 },
    });
  });

  it("reactiva una variante desactivada si Dana vuelve a tildar la misma combinación (conserva id y SKU)", async () => {
    const { deps, tx } = makeDeps({
      prefix: "REM",
      existingSkus: ["REM-0001"],
      existingRows: [{ id: "v1", size: "M", color: "Negro", sku: "REM-0001" }],
    });
    // El form manda la variante SIN id (se había destildado y se volvió a tildar en el navegador).
    await updateProduct(
      "prod-1",
      clean({
        variants: [variant({ size: "M", color: "Negro", sku: "", stock: 7 })],
      }),
      deps,
    );
    expect(tx.productVariant.create).not.toHaveBeenCalled();
    expect(tx.productVariant.deleteMany).not.toHaveBeenCalled();
    expect(tx.productVariant.update).toHaveBeenCalledWith({
      where: { id: "v1" },
      data: expect.objectContaining({ sku: "REM-0001", stock: 7 }),
    });
  });

  it("una variante existente que el form manda con active:false (switch 'Activa' apagado) queda inactiva, sin borrarla ni reactivarla", async () => {
    const { deps, tx } = makeDeps({
      prefix: "REM",
      existingSkus: ["REM-0001"],
      existingRows: [{ id: "v1", size: "M", color: "Negro", sku: "REM-0001" }],
    });
    await updateProduct(
      "prod-1",
      clean({
        variants: [
          variant({
            id: "v1",
            size: "M",
            color: "Negro",
            sku: "REM-0001",
            active: false,
          }),
        ],
      }),
      deps,
    );
    expect(tx.productVariant.deleteMany).not.toHaveBeenCalled();
    expect(tx.productVariant.create).not.toHaveBeenCalled();
    expect(tx.productVariant.update).toHaveBeenCalledWith({
      where: { id: "v1" },
      data: expect.objectContaining({ active: false, sku: "REM-0001" }),
    });
  });

  it("falla si el slug pertenece a otro producto", async () => {
    const { deps } = makeDeps({ prefix: "REM", slugTaken: true });
    await expect(updateProduct("prod-1", clean(), deps)).rejects.toThrow(
      /enlace|slug/i,
    );
  });

  it("rehace las categorías adicionales (borra todas y recrea las que vienen)", async () => {
    const { deps, tx } = makeDeps({
      prefix: "REM",
      existingSkus: ["REM-0001"],
      existingVariantIds: ["v1"],
    });
    await updateProduct(
      "prod-1",
      clean({
        variants: [variant({ id: "v1" })],
        extraCategoryIds: ["cat-gift"],
      }),
      deps,
    );
    expect(tx.productCategory.deleteMany).toHaveBeenCalledWith({
      where: { productId: "prod-1" },
    });
    expect(tx.productCategory.createMany).toHaveBeenCalledWith({
      data: [{ productId: "prod-1", categoryId: "cat-gift" }],
    });
  });
});

describe("softDeleteProduct", () => {
  it("marca deletedAt y desactiva, sin borrar la fila", async () => {
    const { deps } = makeDeps();
    const fixedNow = new Date("2026-06-05T00:00:00Z");
    await softDeleteProduct("prod-1", { ...deps, now: fixedNow });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const call = (deps.db.product.update as any).mock.calls[0][0];
    expect(call.where).toEqual({ id: "prod-1" });
    expect(call.data.deletedAt).toEqual(fixedNow);
    expect(call.data.active).toBe(false);
  });
});
