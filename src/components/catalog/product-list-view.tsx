import { ProductGrid } from "@/components/catalog/product-grid";
import { CatalogPagination } from "@/components/catalog/catalog-pagination";
import { CatalogBreadcrumbs } from "@/components/catalog/catalog-breadcrumbs";
import { SubcategoryNav } from "@/components/catalog/subcategory-nav";
import type { SubcategoryNavItem } from "@/components/catalog/subcategory-nav";
import { SortSelect } from "@/components/catalog/sort-select";
import { FilterPanel } from "@/components/catalog/filter-panel";
import { ActiveFilters } from "@/components/catalog/active-filters";
import type { ProductListResult } from "@/lib/catalog/queries";
import type { FilterFacets } from "@/lib/catalog/filters";
import type { Crumb } from "@/lib/catalog/categories";

type RawSearchParams = Record<string, string | string[] | undefined>;

/** Construye la URL de una página preservando el resto de los params de la búsqueda actual. */
function buildPageHref(
  basePath: string,
  rawParams: RawSearchParams,
  page: number,
): string {
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(rawParams)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) value.forEach((v) => usp.append(key, v));
    else usp.append(key, value);
  }
  if (page <= 1) usp.delete("page");
  else usp.set("page", String(page));
  const qs = usp.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export interface ProductListViewProps {
  title: string;
  result: ProductListResult;
  /** Opciones del panel de filtros sobre todo el alcance, no la página visible
   *  (`getFilterFacets`). */
  facets: FilterFacets;
  basePath: string;
  rawParams: RawSearchParams;
  breadcrumbs?: Crumb[];
  subcategories?: SubcategoryNavItem[];
}

/**
 * ProductListView — cabecera de catálogo (breadcrumb, H1, cantidad, fila de
 * subcategorías, "Filtrar (n)" / "Ordenar"), filtros activos, grilla,
 * paginación y estado vacío (docs/spec/06-storefront.md §3.1-3.4).
 */
export function ProductListView({
  title,
  result,
  facets,
  basePath,
  rawParams,
  breadcrumbs,
  subcategories = [],
}: ProductListViewProps) {
  return (
    <section className="mx-auto max-w-[1600px] space-y-6 px-4 py-10 md:px-10 md:py-14 lg:px-16">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <CatalogBreadcrumbs items={breadcrumbs} />
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="font-display text-3xl text-ink md:text-4xl">
            {title}
          </h1>
          <p className="text-sm text-ink-3">{result.total} productos</p>
        </div>
        <div className="flex items-center gap-6">
          <FilterPanel
            sizeOptions={facets.sizes}
            colorOptions={facets.colors}
          />
          <SortSelect />
        </div>
      </div>

      {subcategories.length > 0 && <SubcategoryNav items={subcategories} />}

      <ActiveFilters />

      {result.items.length > 0 ? (
        <>
          <ProductGrid products={result.items} />
          <CatalogPagination
            page={result.page}
            totalPages={result.totalPages}
            buildHref={(page) => buildPageHref(basePath, rawParams, page)}
          />
        </>
      ) : (
        <div className="border border-line-2 bg-paper-2 px-6 py-16 text-center">
          <p className="text-sm text-ink">No encontramos productos.</p>
          <p className="mt-1 text-xs text-ink-3">Probá quitar algún filtro.</p>
        </div>
      )}
    </section>
  );
}
