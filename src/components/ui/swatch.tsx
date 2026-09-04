"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

const SIZE_PX = { sm: 16, md: 20, lg: 24 } as const;

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
 * en `ink`, nunca `ring`/`shadow-*`.
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
          "rounded-full outline-none transition-colors duration-ui ease-ui",
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
