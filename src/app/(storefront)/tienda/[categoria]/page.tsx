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
  params: Promise<{ categoria: string }>;
}): Promise<Metadata> {
  const { categoria } = await params;
  const { resolved } = await resolveCategoryPath(categoria);
  // 404 real: `/tienda` no tiene `loading.tsx` (ver docs/spec/06-storefront.md §3.11).
  if (!resolved) notFound();
  return {
    title: resolved.category.name,
    description: `Productos de ${resolved.category.name} en Hazing.`,
  };
}

export default async function CategoriaPage({
  params,
  searchParams,
}: {
  params: Promise<{ categoria: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { categoria } = await params;
  const { resolved } = await resolveCategoryPath(categoria);
  if (!resolved) notFound();

  const rawParams = await searchParams;
  const listParams = parseProductListParams(rawParams, {
    categorySlug: categoria,
  });
  const [result, facets] = await Promise.all([
    getProductList(listParams, resolved.categoryIds),
    getFilterFacets(resolved.categoryIds),
  ]);
  const crumbs = buildBreadcrumbs({ category: resolved.category });
  const subcategories = resolved.category.children.map((child) => ({
    slug: child.slug,
    name: child.name,
    href: `/tienda/${resolved.category.slug}/${child.slug}`,
  }));

  return (
    <ProductListView
      title={resolved.category.name}
      result={result}
      facets={facets}
      basePath={`/tienda/${categoria}`}
      rawParams={rawParams}
      breadcrumbs={crumbs}
      subcategories={subcategories}
    />
  );
}
