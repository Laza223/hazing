import Link from "next/link";

import { cn } from "@/lib/utils";

export interface CatalogPaginationProps {
  page: number;
  totalPages: number;
  /** Construye la URL de una página dada preservando el resto de los params. */
  buildHref: (page: number) => string;
}

/**
 * CatalogPagination — "Anterior · 1 2 3 · Siguiente", links de TEXTO con
 * URLs reales (`?page=n`), indexables y compatibles con volver atrás. Sin
 * scroll infinito (docs/spec/06-storefront.md §3.1).
 */
export function CatalogPagination({
  page,
  totalPages,
  buildHref,
}: CatalogPaginationProps) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <nav
      aria-label="Paginación"
      className="flex flex-wrap items-center justify-center gap-6 border-t border-line pt-8 text-sm"
    >
      {page > 1 ? (
        <Link
          href={buildHref(page - 1)}
          className="inline-flex min-h-11 items-center text-ink-2 outline-none transition-colors duration-ui ease-ui hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          Anterior
        </Link>
      ) : (
        <span aria-disabled="true" className="text-ink-4">
          Anterior
        </span>
      )}

      <ul className="flex items-center gap-1">
        {pages.map((p) => (
          <li key={p}>
            <Link
              href={buildHref(p)}
              aria-current={p === page ? "page" : undefined}
              className={cn(
                "inline-flex min-h-11 min-w-11 items-center justify-center outline-none transition-colors duration-ui ease-ui focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
                p === page
                  ? "text-ink underline underline-offset-4"
                  : "text-ink-3 hover:text-ink",
              )}
            >
              {p}
            </Link>
          </li>
        ))}
      </ul>

      {page < totalPages ? (
        <Link
          href={buildHref(page + 1)}
          className="inline-flex min-h-11 items-center text-ink-2 outline-none transition-colors duration-ui ease-ui hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          Siguiente
        </Link>
      ) : (
        <span aria-disabled="true" className="text-ink-4">
          Siguiente
        </span>
      )}
    </nav>
  );
}
