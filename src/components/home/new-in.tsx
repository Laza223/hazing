"use client";

import { useId, useRef } from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { useReveal } from "@/lib/motion/use-reveal";
import { ProductTile } from "@/components/catalog/product-tile";

/**
 * Un producto tal como lo necesita esta sección — más chico que
 * `CatalogListItem` para que el componente no conozca Prisma.
 */
export interface NewInItem {
  id: string;
  href: string;
  name: string;
  price: number;
  compareAtPrice?: number;
  imageSrc?: string | null;
  imageSrcHover?: string | null;
  imageAlt: string;
}

export interface NewInProps {
  items: NewInItem[];
  title?: string;
  /** Link "Ver todo" a la derecha del título. */
  allHref?: string;
  className?: string;
}

/**
 * NewIn — últimos ingresos en la home: grilla 4:5 de 2 columnas en mobile y 4
 * en desktop, igual que el catálogo (no se mezclan ratios ni tamaños).
 *
 * Entrada: `useReveal` (fade + 12px, una sola vez).
 */
export function NewIn({
  items,
  title = "Nuevo",
  allHref = "/tienda?orden=novedades",
  className,
}: NewInProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const headingId = useId();
  useReveal(containerRef);

  if (items.length === 0) return null;

  return (
    <section
      className={cn("px-4 py-16 md:px-10 md:py-24", className)}
      aria-labelledby={headingId}
    >
      <div className="mb-6 flex items-baseline justify-between gap-4 md:mb-10">
        <h2
          id={headingId}
          className="tracking-caps-sm text-xs font-medium uppercase text-ink"
        >
          {title}
        </h2>
        <Link
          href={allHref}
          className="tracking-caps-sm inline-flex min-h-11 items-center text-xs uppercase text-ink-2 underline underline-offset-4 outline-none transition-colors duration-ui ease-ui hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          Ver todo
        </Link>
      </div>
      <div
        ref={containerRef}
        className="grid grid-cols-2 gap-x-4 gap-y-10 md:gap-x-6 lg:grid-cols-4"
      >
        {items.map((item) => (
          <div key={item.id} data-reveal-item>
            <ProductTile
              href={item.href}
              name={item.name}
              price={item.price}
              compareAtPrice={item.compareAtPrice}
              imageSrc={item.imageSrc}
              imageSrcHover={item.imageSrcHover}
              imageAlt={item.imageAlt}
              sizes="(min-width: 1024px) 25vw, 50vw"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
