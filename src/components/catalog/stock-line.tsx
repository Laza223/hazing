import { cn } from "@/lib/utils";

export interface StockLineProps {
  stock: number | null;
  lowStockThreshold?: number;
  className?: string;
}

/**
 * StockLine — comunica stock bajo/agotado con TEXTO, nunca con color/badge
 * (veto de stock falso / urgencia falsa, ver CLAUDE.md y
 * docs/spec/05-direccion-arte.md §3.1). Stock normal (por encima del umbral)
 * no renderiza nada: nunca "En stock".
 */
export function StockLine({
  stock,
  lowStockThreshold = 3,
  className,
}: StockLineProps) {
  if (stock == null) return null;

  if (stock <= 0) {
    return <p className={cn("text-xs text-ink-3", className)}>Agotado</p>;
  }

  if (stock <= lowStockThreshold) {
    return (
      <p className={cn("text-xs text-ink-2", className)}>
        Últimas {stock} unidades
      </p>
    );
  }

  return null;
}
