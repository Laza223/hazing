import Link from "next/link";

import { cn } from "@/lib/utils";
import { PriceLine } from "@/components/catalog/price-line";

export interface ProductTileProps {
  href: string;
  name: string;
  price: number;
  compareAtPrice?: number;
  imageSrc?: string | null;
  imageSrcHover?: string | null;
  imageAlt: string;
  className?: string;
}

/**
 * ProductTile — grilla de catálogo, ratio `4/5`, radio 0
 * (docs/spec/05-direccion-arte.md §3.1). Sin `next/image`: los dominios
 * remotos de Supabase Storage se configuran en Fase 6 (fuera del alcance de
 * esta tarea). Si falta `imageSrc`, no se inventa un sustituto (regla del
 * brief, §12): se muestra el slot con la especificación del asset pendiente.
 */
export function ProductTile({
  href,
  name,
  price,
  compareAtPrice,
  imageSrc,
  imageSrcHover,
  imageAlt,
  className,
}: ProductTileProps) {
  return (
    <Link href={href} className={cn("group block", className)}>
      <div className="relative aspect-[4/5] overflow-hidden border border-line-2 bg-paper-2">
        {imageSrc ? (
          <>
            <img
              src={imageSrc}
              alt={imageAlt}
              loading="lazy"
              className={cn(
                "absolute inset-0 h-full w-full object-cover",
                imageSrcHover &&
                  "transition-opacity duration-image ease-ui group-hover:opacity-0",
              )}
            />
            {imageSrcHover && (
              <img
                src={imageSrcHover}
                alt=""
                aria-hidden="true"
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-image ease-ui group-hover:opacity-100"
              />
            )}
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center p-4 text-center text-xs text-ink-4">
            A4 · foto de producto pendiente
          </div>
        )}
      </div>
      <p className="mt-3 text-[13px] text-ink">{name}</p>
      <PriceLine
        price={price}
        compareAtPrice={compareAtPrice}
        className="mt-1"
      />
    </Link>
  );
}
