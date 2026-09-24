import Link from "next/link";

import { cn } from "@/lib/utils";

export interface SubcategoryNavItem {
  slug: string;
  name: string;
  href: string;
}

/**
 * SubcategoryNav — fila de subcategorías como links de TEXTO
 * (docs/spec/06-storefront.md §3.2): "sin chips redondeados". Solo aparece
 * en `/tienda/[categoria]` cuando la categoría tiene hijos.
 */
export function SubcategoryNav({
  items,
  className,
}: {
  items: SubcategoryNavItem[];
  className?: string;
}) {
  if (items.length === 0) return null;

  return (
    <nav
      aria-label="Subcategorías"
      className={cn("flex flex-wrap gap-x-5 gap-y-2", className)}
    >
      {items.map((item) => (
        <Link
          key={item.slug}
          href={item.href}
          className="inline-flex min-h-11 items-center text-sm text-ink-3 outline-none transition-colors duration-ui ease-ui hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          {item.name}
        </Link>
      ))}
    </nav>
  );
}
