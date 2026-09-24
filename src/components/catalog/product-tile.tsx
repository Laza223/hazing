import Image from "next/image";
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
  /**
   * false si el producto no tiene stock en ninguna variante activa
   * (`isAvailable`/`getProductStockState` de src/lib/catalog/stock.ts) —
   * "Agotado" en texto, siempre visible en el flujo del documento, nunca un
   * badge de color (veto de stock falso, ver CLAUDE.md).
   */
  isAvailable?: boolean;
  /**
   * `true` SOLO en los primeros 4 tiles del viewport inicial — candidatos a
   * LCP (docs/spec/05-direccion-arte.md §10).
   */
  priority?: boolean;
  /** `sizes` de `next/image`; default pensado para la grilla de catálogo (2/3/4 columnas). */
  sizes?: string;
  className?: string;
}

const DEFAULT_SIZES = "(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw";

/**
 * ProductTile — grilla de catálogo, ratio `4/5`, radio 0
 * (docs/spec/05-direccion-arte.md §3.1). `next/image` con los dominios
 * remotos de Supabase Storage ya configurados (`next.config.mjs`, Fase 6).
 * Si falta `imageSrc`, no se inventa un sustituto (regla del brief, §12): se
 * muestra el slot A4 con la especificación del asset pendiente (mismo patrón
 * que `AssetSlot` en src/components/home/hero.tsx).
 */
export function ProductTile({
  href,
  name,
  price,
  compareAtPrice,
  imageSrc,
  imageSrcHover,
  imageAlt,
  isAvailable = true,
  priority = false,
  sizes = DEFAULT_SIZES,
  className,
}: ProductTileProps) {
  return (
    <Link href={href} className={cn("group block", className)}>
      <div className="relative aspect-[4/5] overflow-hidden border border-line-2 bg-paper-2">
        {imageSrc ? (
          <>
            <Image
              src={imageSrc}
              alt={imageAlt}
              fill
              sizes={sizes}
              priority={priority}
              className={cn(
                "object-cover",
                imageSrcHover &&
                  "transition-opacity duration-image ease-ui group-hover:opacity-0",
              )}
            />
            {imageSrcHover && (
              <Image
                src={imageSrcHover}
                alt=""
                aria-hidden="true"
                fill
                sizes={sizes}
                className="object-cover opacity-0 transition-opacity duration-image ease-ui group-hover:opacity-100"
              />
            )}
          </>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-4 text-center">
            <span className="tracking-caps-sm text-[12px] font-medium uppercase text-ink-2">
              A4 · Foto de producto pendiente
            </span>
            <span className="text-[12px] text-ink-4">4:5 — 2000×2500</span>
          </div>
        )}
      </div>
      <p className="mt-3 text-[13px] text-ink">{name}</p>
      {!isAvailable && <p className="mt-1 text-xs text-ink-3">Agotado</p>}
      <PriceLine
        price={price}
        compareAtPrice={compareAtPrice}
        className="mt-1"
      />
    </Link>
  );
}
