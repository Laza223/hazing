import { describe, it, expect } from "vitest";
import {
  validateProduct,
  validateVariant,
  type ProductFormInput,
  type VariantFormInput,
} from "@/lib/admin/products/validation";

const baseVariant = (
  over: Partial<VariantFormInput> = {},
): VariantFormInput => ({
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

const baseProduct = (
  over: Partial<ProductFormInput> = {},
): ProductFormInput => ({
  name: "Vestido Lino",
  slug: "",
  description: "Oversize, calce suelto",
  categoryId: "11111111-1111-1111-1111-111111111111",
  extraCategoryIds: [],
  sizeSystem: "letters",
  basePrice: 45000,
  compareAtPrice: null,
  cost: 18000,
  images: [],
  isFeatured: false,
  heroRank: null,
  tags: ["lino", "verano"],
  seoTitle: null,
  seoDescription: null,
  active: true,
  variants: [baseVariant()],
  ...over,
});

describe("validateVariant", () => {
  it("acepta una variante válida y limpia talle/color", () => {
    const r = validateVariant(baseVariant({ color: "  Negro  " }), "letters");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.color).toBe("Negro");
      expect(r.value.size).toBe("M");
      expect(r.value.lowStockThreshold).toBe(3);
    }
  });

  it("rechaza un talle fuera de la escala del sistema", () => {
    expect(validateVariant(baseVariant({ size: "40" }), "letters").ok).toBe(
      false,
    );
  });

  it("acepta un talle numérico bajo sistema numérico", () => {
    expect(validateVariant(baseVariant({ size: "40" }), "numeric").ok).toBe(
      true,
    );
  });

  it("acepta el talle único bajo sistema one_size", () => {
    expect(validateVariant(baseVariant({ size: "Único" }), "one_size").ok).toBe(
      true,
    );
  });

  it("rechaza color vacío", () => {
    expect(validateVariant(baseVariant({ color: "   " }), "letters").ok).toBe(
      false,
    );
  });

  it("rechaza stock negativo o no entero", () => {
    expect(validateVariant(baseVariant({ stock: -1 }), "letters").ok).toBe(
      false,
    );
    expect(validateVariant(baseVariant({ stock: 1.5 }), "letters").ok).toBe(
      false,
    );
  });

  it("rechaza lowStockThreshold negativo", () => {
    expect(
      validateVariant(baseVariant({ lowStockThreshold: -2 }), "letters").ok,
    ).toBe(false);
  });

  it("rechaza priceOverride <= 0 cuando viene", () => {
    expect(
      validateVariant(baseVariant({ priceOverride: 0 }), "letters").ok,
    ).toBe(false);
    expect(
      validateVariant(baseVariant({ priceOverride: -10 }), "letters").ok,
    ).toBe(false);
  });

  it("acepta priceOverride null", () => {
    expect(
      validateVariant(baseVariant({ priceOverride: null }), "letters").ok,
    ).toBe(true);
  });

  it("rechaza swatchHex con formato inválido", () => {
    expect(
      validateVariant(baseVariant({ swatchHex: "negro" }), "letters").ok,
    ).toBe(false);
    expect(
      validateVariant(baseVariant({ swatchHex: "#FFF" }), "letters").ok,
    ).toBe(false);
  });

  it("acepta swatchHex null", () => {
    expect(
      validateVariant(baseVariant({ swatchHex: null }), "letters").ok,
    ).toBe(true);
  });

  it("conserva un SKU manual no vacío", () => {
    const r = validateVariant(baseVariant({ sku: "rem-0007" }), "letters");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.sku).toBe("REM-0007");
  });

  it("rechaza SKU manual con formato inválido", () => {
    expect(validateVariant(baseVariant({ sku: "REM-1" }), "letters").ok).toBe(
      false,
    );
    expect(validateVariant(baseVariant({ sku: "12-3456" }), "letters").ok).toBe(
      false,
    );
  });
});

describe("validateProduct", () => {
  it("acepta un producto válido, genera slug y normaliza tags", () => {
    const r = validateProduct(
      baseProduct({
        name: "Vestido Líno",
        slug: "",
        tags: ["  Lino ", "lino", ""],
      }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.slug).toBe("vestido-lino");
      expect(r.value.tags).toEqual(["lino"]);
      expect(r.value.variants).toHaveLength(1);
    }
  });

  it("respeta un slug manual normalizándolo", () => {
    const r = validateProduct(baseProduct({ slug: "  Mi Slug  " }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.slug).toBe("mi-slug");
  });

  it("rechaza nombre vacío", () => {
    expect(validateProduct(baseProduct({ name: "  " })).ok).toBe(false);
  });

  it("rechaza categoryId vacío", () => {
    expect(validateProduct(baseProduct({ categoryId: "" })).ok).toBe(false);
  });

  it("rechaza basePrice <= 0", () => {
    expect(validateProduct(baseProduct({ basePrice: 0 })).ok).toBe(false);
  });

  it("rechaza cost negativo", () => {
    expect(validateProduct(baseProduct({ cost: -1 })).ok).toBe(false);
  });

  it("cost vacío pide cargarlo, no dice que es negativo", () => {
    const r = validateProduct(baseProduct({ cost: "" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/Cargá el costo/);
  });

  it("acepta cost 0", () => {
    expect(validateProduct(baseProduct({ cost: 0 })).ok).toBe(true);
  });

  it("rechaza compareAtPrice menor o igual a basePrice", () => {
    expect(
      validateProduct(baseProduct({ basePrice: 3000, compareAtPrice: 3000 }))
        .ok,
    ).toBe(false);
    expect(
      validateProduct(baseProduct({ basePrice: 3000, compareAtPrice: 2500 }))
        .ok,
    ).toBe(false);
  });

  it("acepta compareAtPrice mayor a basePrice", () => {
    const r = validateProduct(
      baseProduct({ basePrice: 3000, compareAtPrice: 4000 }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.compareAtPrice).toBe(4000);
  });

  it("acepta compareAtPrice null", () => {
    expect(validateProduct(baseProduct({ compareAtPrice: null })).ok).toBe(
      true,
    );
  });

  it("propaga el error si una variante es inválida", () => {
    const r = validateProduct(
      baseProduct({ variants: [baseVariant({ color: "" })] }),
    );
    expect(r.ok).toBe(false);
  });

  it("rechaza variantes con el mismo par talle+color (case-insensitive en color)", () => {
    const r = validateProduct(
      baseProduct({
        variants: [
          baseVariant({ size: "M", color: "Negro" }),
          baseVariant({ size: "M", color: "negro" }),
        ],
      }),
    );
    expect(r.ok).toBe(false);
  });

  it("acepta el mismo talle con distinto color", () => {
    const r = validateProduct(
      baseProduct({
        variants: [
          baseVariant({ size: "M", color: "Negro" }),
          baseVariant({ size: "M", color: "Blanco" }),
        ],
      }),
    );
    expect(r.ok).toBe(true);
  });

  it("rechaza cero variantes: un producto necesita al menos una", () => {
    const r = validateProduct(baseProduct({ variants: [] }));
    expect(r.ok).toBe(false);
  });

  it("rechaza SKU manuales duplicados entre variantes", () => {
    const r = validateProduct(
      baseProduct({
        variants: [
          baseVariant({ size: "M", color: "Negro", sku: "REM-0001" }),
          baseVariant({ size: "L", color: "Negro", sku: "REM-0001" }),
        ],
      }),
    );
    expect(r.ok).toBe(false);
  });

  it("acepta categorías adicionales y las conserva", () => {
    const r = validateProduct(
      baseProduct({ extraCategoryIds: ["cat-a", "cat-b"] }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.extraCategoryIds).toEqual(["cat-a", "cat-b"]);
  });

  it("deduplica categorías adicionales repetidas", () => {
    const r = validateProduct(
      baseProduct({ extraCategoryIds: ["cat-a", "cat-a", "cat-b"] }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.extraCategoryIds).toEqual(["cat-a", "cat-b"]);
  });

  it("excluye la categoría primaria de las adicionales aunque venga tildada", () => {
    const r = validateProduct(
      baseProduct({
        categoryId: "11111111-1111-1111-1111-111111111111",
        extraCategoryIds: ["11111111-1111-1111-1111-111111111111", "cat-b"],
      }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.extraCategoryIds).toEqual(["cat-b"]);
  });
});
