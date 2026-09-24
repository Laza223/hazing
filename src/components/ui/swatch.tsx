"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

const SIZE_PX = { sm: 16, md: 20, lg: 24 } as const;
/** Hit-slop para que el target táctil llegue a ≥44px sin agrandar el punto visible
 *  (docs/spec/05-direccion-arte.md §7). Un `::before` absoluto se posiciona desde
 *  el borde interno, así que se descuenta el borde de 1px de cada lado:
 *  `-inset` = (44 - (tamaño del punto - 2)) / 2. Medido: sin descontarlo, 42×42. */
const TOUCH_INSET = {
  sm: "before:-inset-[15px]",
  md: "before:-inset-[13px]",
  lg: "before:-inset-3",
} as const;

export interface SwatchProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "aria-label"
> {
  hex: string;
  size?: keyof typeof SIZE_PX;
  selected?: boolean;
  label: string;
}

/**
 * Swatch — punto de color, `rounded-full` (única excepción a radio 0/2px del
 * brief, ver docs/spec/05-direccion-arte.md §3.1). Seleccionado = `outline`
 * en `ink`, nunca `ring`/`shadow-*`. Borde de 1px `line` fijo en todos los
 * colores — sin él, un swatch blanco/claro desaparece sobre `paper`
 * (hallazgo de UX). El botón mide `px`×`px` (el punto que se ve), pero un
 * `::before` invisible extiende el área táctil real a ≥44×44 sin agrandar
 * el punto (docs/spec/05-direccion-arte.md §7).
 */
const Swatch = React.forwardRef<HTMLButtonElement, SwatchProps>(
  (
    { className, hex, size = "md", selected = false, label, style, ...props },
    ref,
  ) => {
    const px = SIZE_PX[size];
    return (
      <button
        ref={ref}
        type="button"
        aria-pressed={selected}
        aria-label={label}
        className={cn(
          "relative rounded-full border border-line outline-none transition-colors duration-ui ease-ui before:absolute before:content-['']",
          TOUCH_INSET[size],
          selected
            ? "outline outline-2 outline-offset-2 outline-ink"
            : "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
          className,
        )}
        style={{ width: px, height: px, backgroundColor: hex, ...style }}
        {...props}
      />
    );
  },
);
Swatch.displayName = "Swatch";

export { Swatch };
