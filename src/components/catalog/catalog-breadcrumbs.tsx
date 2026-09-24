import Link from "next/link";

import type { Crumb } from "@/lib/catalog/categories";

/**
 * CatalogBreadcrumbs — 12px, mayúsculas 0.12em (docs/spec/06-storefront.md §3.2).
 * Ruta de texto plana, sin el componente shadcn `Breadcrumb` (no generado
 * para el storefront, ver docs/spec/05-direccion-arte.md §2).
 */
export function CatalogBreadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Ruta de navegación" className="tracking-caps-sm text-xs">
      <ol className="flex flex-wrap items-center gap-1 uppercase text-ink-3">
        {items.map((crumb, index) => (
          <li key={crumb.href} className="flex items-center gap-1">
            {index > 0 && <span aria-hidden="true">/</span>}
            {crumb.current ? (
              <span aria-current="page" className="text-ink-2">
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className="inline-flex min-h-11 items-center outline-none transition-colors duration-ui ease-ui hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                {crumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
