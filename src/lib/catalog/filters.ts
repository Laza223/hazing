import type { Prisma } from "@prisma/client";

import { SIZE_SCALES } from "@/lib/catalog/sizes";

export const PAGE_SIZE = 12;

export type SortKey = "relevancia" | "precio_asc" | "precio_desc" | "novedades";
export const SORT_KEYS: SortKey[] = [
  "relevancia",
  "precio_asc",
  "precio_desc",
  "novedades",
];

export interface ProductListParams {
  categorySlug?: string;
  subcategorySlug?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  onSale: boolean;
  inStockOnly: boolean;
  /** Talles pedidos (`?talle=M&talle=L`), multivalor. Vacío = sin filtrar por talle. */
  sizes: string[];
  /** Colores pedidos (`?color=Negro&color=Blanco`), multivalor. Vacío = sin filtrar por color. */
  colors: string[];
  sort: SortKey;
  page: number;
}

type RawParams = Record<string, string | string[] | undefined>;

function firstStr(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}
/** Valores de un param multivalor, recortados, sin vacíos ni repetidos:
 *  `?talle=` o `?talle=%20` no tienen que filtrar a cero productos. */
function allStr(v: string | string[] | undefined): string[] {
  if (v === undefined) return [];
  const values = (Array.isArray(v) ? v : [v])
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return [...new Set(values)];
}
function toNonNegInt(v: string | undefined): number | undefined {
  if (v === undefined || v === "") return undefined;
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 ? n : undefined;
}

export function parseProductListParams(
  raw: RawParams,
  opts?: { categorySlug?: string; subcategorySlug?: string },
): ProductListParams {
  const sortRaw = firstStr(raw.orden) as SortKey | undefined;
  const sort: SortKey =
    sortRaw && SORT_KEYS.includes(sortRaw) ? sortRaw : "relevancia";
  const pageParsed = toNonNegInt(firstStr(raw.page));
  const page = pageParsed && pageParsed >= 1 ? pageParsed : 1;
  const q = firstStr(raw.q)?.trim();
  return {
    categorySlug: opts?.categorySlug,
    subcategorySlug: opts?.subcategorySlug,
    minPrice: toNonNegInt(firstStr(raw.min)),
    maxPrice: toNonNegInt(firstStr(raw.max)),
    search: q && q.length > 0 ? q : undefined,
    onSale: firstStr(raw.oferta) === "1",
    inStockOnly: firstStr(raw.disponible) === "1",
    sizes: allStr(raw.talle),
    colors: allStr(raw.color),
    sort,
    page,
  };
}

/**
 * WHERE de Prisma para Product. `categoryIds` lo resuelve el caller (slug→id, incl. subcats).
 * Nota oferta: el seed mantiene la invariante compareAtPrice > basePrice, por eso `{ not: null }` alcanza.
 * Nota talle/color: entra si tiene al menos UNA variante activa que cumpla talle Y color a la vez
 * (y stock, si `disponible=1`) — un único `variants.some`, nunca condiciones sueltas sobre
 * variantes distintas.
 */
export function buildProductWhere(
  params: ProductListParams,
  categoryIds: string[] | null,
): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = { active: true, deletedAt: null };
  if (categoryIds && categoryIds.length > 0) {
    // Categoría primaria O adicional (tabla de asociación `categories`).
    where.OR = [
      { categoryId: { in: categoryIds } },
      { categories: { some: { categoryId: { in: categoryIds } } } },
    ];
  }
  if (params.search) {
    const searchConditions: Prisma.ProductWhereInput[] = [
      { name: { contains: params.search, mode: "insensitive" } },
      { description: { contains: params.search, mode: "insensitive" } },
      { tags: { has: params.search.toLowerCase() } },
    ];
    if (where.OR) {
      where.AND = [{ OR: where.OR }, { OR: searchConditions }];
      delete where.OR;
    } else {
      where.OR = searchConditions;
    }
  }
  if (params.minPrice !== undefined || params.maxPrice !== undefined) {
    where.basePrice = {
      ...(params.minPrice !== undefined ? { gte: params.minPrice } : {}),
      ...(params.maxPrice !== undefined ? { lte: params.maxPrice } : {}),
    };
  }
  if (params.onSale) {
    where.compareAtPrice = { not: null };
  }
  if (
    params.sizes.length > 0 ||
    params.colors.length > 0 ||
    params.inStockOnly
  ) {
    where.variants = {
      some: {
        active: true,
        ...(params.sizes.length > 0 ? { size: { in: params.sizes } } : {}),
        ...(params.colors.length > 0 ? { color: { in: params.colors } } : {}),
        ...(params.inStockOnly ? { stock: { gt: 0 } } : {}),
      },
    };
  }
  return where;
}

export interface ColorFacet {
  name: string;
  hex: string | null;
}

export interface FilterFacets {
  sizes: string[];
  colors: ColorFacet[];
}

/** Orden de talles para el panel de filtros, que mezcla sistemas (letras,
 *  numérico, único): primero por escala en ese orden, fuera de escala al final. */
const SIZE_FACET_ORDER = [
  ...SIZE_SCALES.letters,
  ...SIZE_SCALES.numeric,
  ...SIZE_SCALES.one_size,
];

/**
 * Opciones de talle y color del panel de filtros a partir de las variantes
 * activas de TODO el alcance (categoría), no de la página visible: si salieran
 * del listado paginado, un talle que solo existe en la página 2 no se podría
 * elegir desde la 1.
 */
export function buildFilterFacets(
  rows: { size: string; color: string; swatchHex: string | null }[],
): FilterFacets {
  const sizes = [...new Set(rows.map((r) => r.size))].sort((a, b) => {
    const ia = SIZE_FACET_ORDER.indexOf(a);
    const ib = SIZE_FACET_ORDER.indexOf(b);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.localeCompare(b, "es");
  });
  const colors = new Map<string, string | null>();
  for (const r of rows) {
    // El primer swatch no nulo gana: dos variantes del mismo color pueden
    // venir una con hex y otra sin cargar.
    if (!colors.get(r.color)) colors.set(r.color, r.swatchHex);
  }
  return {
    sizes,
    colors: [...colors.entries()]
      .map(([name, hex]) => ({ name, hex }))
      .sort((a, b) => a.name.localeCompare(b.name, "es")),
  };
}

export function buildProductOrderBy(
  params: ProductListParams,
): Prisma.ProductOrderByWithRelationInput[] {
  switch (params.sort) {
    case "precio_asc":
      return [{ basePrice: "asc" }, { name: "asc" }];
    case "precio_desc":
      return [{ basePrice: "desc" }, { name: "asc" }];
    case "novedades":
      return [{ createdAt: "desc" }];
    case "relevancia":
    default:
      return [
        { isFeatured: "desc" },
        { heroRank: "asc" },
        { createdAt: "desc" },
      ];
  }
}

export function buildPagination(params: ProductListParams): {
  skip: number;
  take: number;
} {
  return { skip: (params.page - 1) * PAGE_SIZE, take: PAGE_SIZE };
}
