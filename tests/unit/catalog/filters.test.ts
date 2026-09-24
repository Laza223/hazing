import { describe, it, expect } from "vitest";
import {
  PAGE_SIZE,
  parseProductListParams,
  buildProductWhere,
  buildProductOrderBy,
  buildPagination,
  buildFilterFacets,
} from "@/lib/catalog/filters";

describe("buildFilterFacets", () => {
  it("ordena talles por escala mezclando sistemas y deja los raros al final", () => {
    const facets = buildFilterFacets([
      { size: "40", color: "Negro", swatchHex: null },
      { size: "Único", color: "Negro", swatchHex: null },
      { size: "L", color: "Negro", swatchHex: null },
      { size: "XS", color: "Negro", swatchHex: null },
      { size: "T2", color: "Negro", swatchHex: null },
      { size: "36", color: "Negro", swatchHex: null },
    ]);
    expect(facets.sizes).toEqual(["XS", "L", "36", "40", "Único", "T2"]);
  });

  it("colores únicos, alfabéticos, y el swatch no nulo gana", () => {
    const facets = buildFilterFacets([
      { size: "M", color: "Negro", swatchHex: null },
      { size: "L", color: "Negro", swatchHex: "#171717" },
      { size: "M", color: "Arena", swatchHex: "#D8CBB5" },
    ]);
    expect(facets.colors).toEqual([
      { name: "Arena", hex: "#D8CBB5" },
      { name: "Negro", hex: "#171717" },
    ]);
  });
});

describe("parseProductListParams", () => {
  it("defaults sanos", () => {
    const p = parseProductListParams({});
    expect(p).toMatchObject({
      sort: "relevancia",
      page: 1,
      onSale: false,
      inStockOnly: false,
      sizes: [],
      colors: [],
    });
    expect(p.minPrice).toBeUndefined();
  });
  it("lee orden, page, precios y toggles", () => {
    const p = parseProductListParams({
      orden: "precio_asc",
      page: "3",
      min: "500",
      max: "2000",
      oferta: "1",
      disponible: "1",
    });
    expect(p).toMatchObject({
      sort: "precio_asc",
      page: 3,
      minPrice: 500,
      maxPrice: 2000,
      onSale: true,
      inStockOnly: true,
    });
  });
  it("orden inválido → relevancia; page<1 → 1", () => {
    expect(parseProductListParams({ orden: "xxx", page: "0" })).toMatchObject({
      sort: "relevancia",
      page: 1,
    });
  });
  it("inyecta category/subcategory slugs", () => {
    const p = parseProductListParams(
      {},
      { categorySlug: "remeras", subcategorySlug: "oversize" },
    );
    expect(p).toMatchObject({
      categorySlug: "remeras",
      subcategorySlug: "oversize",
    });
  });
  it("talle y color: un solo valor → array de 1", () => {
    const p = parseProductListParams({ talle: "M", color: "Negro" });
    expect(p.sizes).toEqual(["M"]);
    expect(p.colors).toEqual(["Negro"]);
  });
  it("talle y color: multivalor (?talle=M&talle=L) → array con todos los valores", () => {
    const p = parseProductListParams({
      talle: ["M", "L"],
      color: ["Negro", "Blanco"],
    });
    expect(p.sizes).toEqual(["M", "L"]);
    expect(p.colors).toEqual(["Negro", "Blanco"]);
  });
  it("sin talle/color → arrays vacíos", () => {
    const p = parseProductListParams({});
    expect(p.sizes).toEqual([]);
    expect(p.colors).toEqual([]);
  });
  it("talle/color vacíos, con espacios o repetidos no filtran a cero", () => {
    const p = parseProductListParams({
      talle: ["", " M ", "M", "  "],
      color: "",
    });
    expect(p.sizes).toEqual(["M"]);
    expect(p.colors).toEqual([]);
  });
});

describe("buildProductWhere", () => {
  it("siempre filtra activos y no borrados", () => {
    const where = buildProductWhere(parseProductListParams({}), null);
    expect(where).toMatchObject({ active: true, deletedAt: null });
    expect(where.OR).toBeUndefined();
  });
  it("sin categoryIds (array vacío) tampoco filtra por categoría", () => {
    const where = buildProductWhere(parseProductListParams({}), []);
    expect(where.OR).toBeUndefined();
  });
  it("filtra por categoryIds (primaria o adicional), precio, oferta y disponible", () => {
    const params = parseProductListParams({
      min: "500",
      max: "2000",
      oferta: "1",
      disponible: "1",
    });
    const where = buildProductWhere(params, ["c1", "c2"]);
    expect(where.OR).toEqual([
      { categoryId: { in: ["c1", "c2"] } },
      { categories: { some: { categoryId: { in: ["c1", "c2"] } } } },
    ]);
    expect(where.basePrice).toEqual({ gte: 500, lte: 2000 });
    expect(where.compareAtPrice).toEqual({ not: null });
    expect(where.variants).toEqual({
      some: { active: true, stock: { gt: 0 } },
    });
  });
  it("sin talle/color/disponible no agrega condición de variantes", () => {
    const where = buildProductWhere(parseProductListParams({}), null);
    expect(where.variants).toBeUndefined();
  });
  it("talle y color exigen la MISMA variante activa (un único variants.some, no condiciones sueltas)", () => {
    const params = parseProductListParams({
      talle: ["M", "L"],
      color: ["Negro"],
    });
    const where = buildProductWhere(params, null);
    expect(where.variants).toEqual({
      some: {
        active: true,
        size: { in: ["M", "L"] },
        color: { in: ["Negro"] },
      },
    });
  });
  it("talle + color + disponible combinan en la misma condición de variante", () => {
    const params = parseProductListParams({
      talle: ["M"],
      color: ["Negro"],
      disponible: "1",
    });
    const where = buildProductWhere(params, null);
    expect(where.variants).toEqual({
      some: {
        active: true,
        size: { in: ["M"] },
        color: { in: ["Negro"] },
        stock: { gt: 0 },
      },
    });
  });
  it("solo talle (sin color) filtra solo por size", () => {
    const params = parseProductListParams({ talle: ["M"] });
    const where = buildProductWhere(params, null);
    expect(where.variants).toEqual({
      some: { active: true, size: { in: ["M"] } },
    });
  });
});

describe("buildProductOrderBy", () => {
  it("mapea cada sort", () => {
    expect(
      buildProductOrderBy(parseProductListParams({ orden: "precio_asc" })),
    ).toEqual([{ basePrice: "asc" }, { name: "asc" }]);
    expect(
      buildProductOrderBy(parseProductListParams({ orden: "precio_desc" })),
    ).toEqual([{ basePrice: "desc" }, { name: "asc" }]);
    expect(
      buildProductOrderBy(parseProductListParams({ orden: "novedades" })),
    ).toEqual([{ createdAt: "desc" }]);
    expect(
      buildProductOrderBy(parseProductListParams({ orden: "relevancia" })),
    ).toEqual([
      { isFeatured: "desc" },
      { heroRank: "asc" },
      { createdAt: "desc" },
    ]);
  });
});

describe("buildPagination", () => {
  it("skip/take según page", () => {
    expect(buildPagination(parseProductListParams({ page: "1" }))).toEqual({
      skip: 0,
      take: PAGE_SIZE,
    });
    expect(buildPagination(parseProductListParams({ page: "3" }))).toEqual({
      skip: 2 * PAGE_SIZE,
      take: PAGE_SIZE,
    });
  });
});
