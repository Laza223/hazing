import "server-only";
import { cache } from "react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  buildFilterFacets,
  buildPagination,
  buildProductOrderBy,
  buildProductWhere,
  PAGE_SIZE,
  parseProductListParams,
  type FilterFacets,
  type ProductListParams,
} from "@/lib/catalog/filters";
import {
  buildCategoryTree,
  findCategoryByPath,
  type CategoryNode,
} from "@/lib/catalog/categories";
import type { CatalogProduct } from "@/lib/catalog/types";

export const PRODUCT_INCLUDE = {
  category: true,
  variants: { where: { active: true }, orderBy: { order: "asc" } },
} satisfies Prisma.ProductInclude;

/** Árbol de categorías activas (2 niveles). `cache()` por request: lo piden
 *  `generateMetadata`, la página y (a futuro) el menú. */
export const getCategoryTree = cache(async (): Promise<CategoryNode[]> => {
  const rows = await prisma.category.findMany({
    where: { active: true },
    select: {
      id: true,
      slug: true,
      name: true,
      parentId: true,
      order: true,
      image: true,
      active: true,
      showInMenu: true,
    },
    orderBy: { order: "asc" },
  });
  return buildCategoryTree(rows);
});

export interface ProductListResult {
  items: CatalogProduct[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Listado paginado de productos según params ya parseados. `categoryIds` resuelto por el caller. */
export async function getProductList(
  params: ProductListParams,
  categoryIds: string[] | null,
): Promise<ProductListResult> {
  const where = buildProductWhere(params, categoryIds);
  const { skip, take } = buildPagination(params);
  const [rows, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: PRODUCT_INCLUDE,
      orderBy: buildProductOrderBy(params),
    }),
    prisma.product.count({ where }),
  ]);

  // Asegura que los productos con stock disponible aparezcan primero (agotados al final de la tienda)
  const sorted = [...rows].sort((a, b) => {
    const aInStock = a.variants.some((v) => v.active && v.stock > 0);
    const bInStock = b.variants.some((v) => v.active && v.stock > 0);
    if (aInStock === bInStock) return 0;
    return aInStock ? -1 : 1;
  });

  const pagedItems = sorted.slice(skip, skip + take);

  return {
    items: pagedItems as CatalogProduct[],
    total,
    page: params.page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

/**
 * Talles y colores de las variantes activas de todos los productos visibles
 * en el alcance (`categoryIds`, o toda la tienda con null), sin aplicar los
 * filtros actuales: las opciones del panel no desaparecen al elegir una.
 */
export async function getFilterFacets(
  categoryIds: string[] | null,
): Promise<FilterFacets> {
  const rows = await prisma.productVariant.findMany({
    where: {
      active: true,
      product: buildProductWhere(parseProductListParams({}), categoryIds),
    },
    select: { size: true, color: true, swatchHex: true },
    distinct: ["size", "color"],
  });
  return buildFilterFacets(rows);
}

/** Resuelve slugs de categoría/subcategoría a ids (para filtrar) y devuelve el árbol. */
export async function resolveCategoryPath(
  categorySlug?: string,
  subcategorySlug?: string,
) {
  const tree = await getCategoryTree();
  const resolved = categorySlug
    ? findCategoryByPath(tree, categorySlug, subcategorySlug)
    : null;
  return { resolved, tree };
}

/** Producto por slug (activo, no borrado) con categoría + variantes activas. null si no existe.
 *  `cache()`: `generateMetadata` y la página lo piden en el mismo request; sin
 *  esto son dos consultas iguales (Prisma no pasa por el dedupe de `fetch`). */
export const getProductBySlug = cache(
  async (slug: string): Promise<CatalogProduct | null> => {
    const product = await prisma.product.findFirst({
      where: { slug, active: true, deletedAt: null },
      include: PRODUCT_INCLUDE,
    });
    return product as CatalogProduct | null;
  },
);

/** Slugs de todos los productos activos (para generateStaticParams / sitemap futuro). */
export async function getActiveProductSlugs(): Promise<string[]> {
  const rows = await prisma.product.findMany({
    where: { active: true, deletedAt: null },
    select: { slug: true },
  });
  return rows.map((r) => r.slug);
}

/** Héroes de catálogo (destacados) para el Home. */
export async function getFeaturedProducts(
  limit = 8,
): Promise<CatalogProduct[]> {
  const rows = await prisma.product.findMany({
    where: { active: true, deletedAt: null, isFeatured: true },
    include: PRODUCT_INCLUDE,
    orderBy: [{ heroRank: "asc" }, { createdAt: "desc" }],
  });
  const inStockFirst = [...rows].sort((a, b) => {
    const aInStock = a.variants.some((v) => v.active && v.stock > 0);
    const bInStock = b.variants.some((v) => v.active && v.stock > 0);
    if (aInStock === bInStock) return 0;
    return aInStock ? -1 : 1;
  });
  return inStockFirst.slice(0, limit) as CatalogProduct[];
}

/** Productos recientes (fallback del Home si no hay destacados). */
export async function getNewestProducts(limit = 8): Promise<CatalogProduct[]> {
  const rows = await prisma.product.findMany({
    where: { active: true, deletedAt: null },
    include: PRODUCT_INCLUDE,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows as CatalogProduct[];
}
