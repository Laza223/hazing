import { formatPrice } from "@/lib/money";
import { cn } from "@/lib/utils";

export interface PriceLineProps {
  price: number;
  compareAtPrice?: number;
  className?: string;
}

/**
 * PriceLine — precio con `tabular-nums` (docs/spec/05-direccion-arte.md
 * §3.1, §7). `compareAtPrice` (precio de lista) se muestra tachado en
 * `ink-3` antes del precio actual — nunca badge de oferta rojo (veto del
 * proyecto en CLAUDE.md).
 */
export function PriceLine({
  price,
  compareAtPrice,
  className,
}: PriceLineProps) {
  const hasDiscount = compareAtPrice != null && compareAtPrice > price;

  return (
    <p
      className={cn(
        "flex items-baseline gap-2 text-sm tabular-nums text-ink",
        className,
      )}
    >
      {hasDiscount && (
        <span className="text-ink-3 line-through">
          {formatPrice(compareAtPrice as number)}
        </span>
      )}
      <span>{formatPrice(price)}</span>
    </p>
  );
}
