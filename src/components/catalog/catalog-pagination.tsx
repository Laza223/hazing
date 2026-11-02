import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { getPageItems } from "@/lib/catalog/pagination";

export interface CatalogPaginationProps {
  page: number;
  totalPages: number;
  /** Construye la URL de una página dada preservando el resto de los params. */
  buildHref: (page: number) => string;
}

const focus =
  "outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";
const arrow =
  "inline-flex size-11 items-center justify-center transition-colors duration-ui ease-ui";

/**
 * CatalogPagination — "‹ 1 2 3 4 5 … 12 ›", links con URLs reales (`?page=n`),
 * indexables y compatibles con volver atrás. Sin scroll infinito
 * (docs/spec/06-storefront.md §3.1).
 */
export function CatalogPagination({
  page,
  totalPages,
  buildHref,
}: CatalogPaginationProps) {
  if (totalPages <= 1) return null;

  const items = getPageItems(page, totalPages);

  return (
    <nav
      aria-label="Paginación"
      className="flex flex-wrap items-center justify-center gap-1 border-t border-line pt-8 text-sm"
    >
      {page > 1 ? (
        <Link
          href={buildHref(page - 1)}
          aria-label="Página anterior"
          className={cn(arrow, "text-ink-2 hover:text-ink", focus)}
        >
          <ChevronLeft className="size-5" aria-hidden />
        </Link>
      ) : (
        <span aria-hidden="true" className={cn(arrow, "text-ink-4")}>
          <ChevronLeft className="size-5" />
        </span>
      )}

      <ul className="flex items-center gap-1">
        {items.map((item, index) =>
          item === "gap" ? (
            <li
              key={`gap-${index}`}
              aria-hidden="true"
              className="inline-flex size-8 items-center justify-center text-ink-4 sm:size-11"
            >
              …
            </li>
          ) : (
            <li key={item}>
              <Link
                href={buildHref(item)}
                aria-label={`Página ${item}`}
                aria-current={item === page ? "page" : undefined}
                className={cn(
                  "inline-flex size-9 items-center justify-center border transition-colors duration-ui ease-ui sm:size-11",
                  focus,
                  item === page
                    ? "border-ink text-ink"
                    : "border-transparent text-ink-3 hover:text-ink",
                )}
              >
                {item}
              </Link>
            </li>
          ),
        )}
      </ul>

      {page < totalPages ? (
        <Link
          href={buildHref(page + 1)}
          aria-label="Página siguiente"
          className={cn(arrow, "text-ink-2 hover:text-ink", focus)}
        >
          <ChevronRight className="size-5" aria-hidden />
        </Link>
      ) : (
        <span aria-hidden="true" className={cn(arrow, "text-ink-4")}>
          <ChevronRight className="size-5" />
        </span>
      )}
    </nav>
  );
}
