"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { PriceLine } from "@/components/catalog/price-line";

export interface MobileStickyBuyBarProps {
  productName: string;
  price: number;
  compareAtPrice?: number;
  sizeLabel: string | null;
  disabled: boolean;
  pending: boolean;
  /** Recibe el botón de la barra, para devolverle el foco al cerrar el drawer. */
  onAdd: (trigger: HTMLElement) => void;
  /** id del botón principal — se observa para saber cuándo mostrar esta barra. */
  watchTargetId: string;
}

/**
 * MobileStickyBuyBar — barra sticky inferior en mobile
 * (docs/spec/05-direccion-arte.md §7, §9): precio + talle elegido +
 * "Agregar". Visible SOLO cuando el botón principal salió del viewport
 * (IntersectionObserver) — mientras no es visible, ni siquiera se monta, así
 * que no queda un control fuera de pantalla interceptando el foco por
 * teclado.
 */
export function MobileStickyBuyBar({
  productName,
  price,
  compareAtPrice,
  sizeLabel,
  disabled,
  pending,
  onAdd,
  watchTargetId,
}: MobileStickyBuyBarProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const target = document.getElementById(watchTargetId);
    if (!target) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [watchTargetId]);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-4 border-t border-line bg-paper px-4 py-3 md:hidden">
      <div className="min-w-0">
        <p className="truncate text-xs text-ink-2">{productName}</p>
        <div className="flex items-baseline gap-2">
          <PriceLine price={price} compareAtPrice={compareAtPrice} />
          {sizeLabel && <span className="text-xs text-ink-3">{sizeLabel}</span>}
        </div>
      </div>
      <Button
        type="button"
        size="sm"
        onClick={(event) => onAdd(event.currentTarget)}
        disabled={disabled || pending}
        className="min-h-11 shrink-0"
      >
        Agregar
      </Button>
    </div>
  );
}
