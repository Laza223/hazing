import type { Metadata } from "next";

import { parseProductListParams } from "@/lib/catalog/filters";
import { getFilterFacets, getProductList } from "@/lib/catalog/queries";
import { buildBreadcrumbs } from "@/lib/catalog/categories";
import { ProductListView } from "@/components/catalog/product-list-view";

export const metadata: Metadata = {
  title: "Tienda",
  description: "Explorá todo el catálogo de Hazing.",
};

export default async function TiendaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const rawParams = await searchParams;
  const params = parseProductListParams(rawParams);
  const [result, facets] = await Promise.all([
    getProductList(params, null),
    getFilterFacets(null),
  ]);

  return (
    <ProductListView
      title="Tienda"
      result={result}
      facets={facets}
      basePath="/tienda"
      rawParams={rawParams}
      breadcrumbs={buildBreadcrumbs({})}
    />
  );
}
