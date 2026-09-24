import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { parseProductListParams } from "@/lib/catalog/filters";
import {
  getFilterFacets,
  getProductList,
  resolveCategoryPath,
} from "@/lib/catalog/queries";
import { buildBreadcrumbs } from "@/lib/catalog/categories";
import { ProductListView } from "@/components/catalog/product-list-view";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ categoria: string; subcategoria: string }>;
}): Promise<Metadata> {
  const { categoria, subcategoria } = await params;
  const { resolved } = await resolveCategoryPath(categoria, subcategoria);
  // 404 real: `/tienda` no tiene `loading.tsx` (ver docs/spec/06-storefront.md §3.11).
  if (!resolved?.subcategory) notFound();
  return {
    title: resolved.subcategory.name,
    description: `Productos de ${resolved.subcategory.name} en Hazing.`,
  };
}

export default async function SubcategoriaPage({
  params,
  searchParams,
}: {
  params: Promise<{ categoria: string; subcategoria: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { categoria, subcategoria } = await params;
  const { resolved } = await resolveCategoryPath(categoria, subcategoria);
  if (!resolved?.subcategory) notFound();

  const rawParams = await searchParams;
  const listParams = parseProductListParams(rawParams, {
    categorySlug: categoria,
    subcategorySlug: subcategoria,
  });
  const [result, facets] = await Promise.all([
    getProductList(listParams, resolved.categoryIds),
    getFilterFacets(resolved.categoryIds),
  ]);
  const crumbs = buildBreadcrumbs({
    category: resolved.category,
    subcategory: resolved.subcategory,
  });

  return (
    <ProductListView
      title={resolved.subcategory.name}
      result={result}
      facets={facets}
      basePath={`/tienda/${categoria}/${subcategoria}`}
      rawParams={rawParams}
      breadcrumbs={crumbs}
    />
  );
}
