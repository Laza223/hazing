import { forwardRef } from "react";

import { cn } from "@/lib/utils";
import {
  WORDMARK_PATH_D,
  WORDMARK_VIEWBOX,
} from "@/components/brand/wordmark-path";

export interface WordmarkProps {
  className?: string;
}

/**
 * Wordmark de Hazing — SVG inline (NO `<img src="...svg">`).
 *
 * Un `<img>` apuntando a un SVG con `fill="currentColor"` NO hereda el
 * `color` del documento anfitrión: el SVG referenciado es un contexto
 * aislado, así que `currentColor` resuelve contra su propio valor inicial
 * (negro puro). Confirmado en la revisión adversarial de la sub-fase 5.1b:
 * el wordmark vía `<img>` rendía `rgb(0,0,0)` en vez de `ink` (#171717),
 * violando la regla explícita del brief ("nunca #000 puro" —
 * docs/spec/05-direccion-arte.md §3.1). Un SVG inline sí hereda `color` vía
 * `currentColor`, por eso este componente en vez del `<img>` original.
 *
 * Decorativo por defecto (`aria-hidden`): el nombre accesible lo da el
 * elemento contenedor (ej. el `<Link aria-label="Hazing">` del header).
 *
 * Reenvía el `ref` al `<svg>` — lo usa `BrandEntrance` para animar el
 * `clip-path` del reveal con GSAP.
 */
export const Wordmark = forwardRef<SVGSVGElement, WordmarkProps>(
  function Wordmark({ className }, ref) {
    return (
      <svg
        ref={ref}
        viewBox={WORDMARK_VIEWBOX}
        aria-hidden="true"
        className={cn("text-ink", className)}
      >
        <path
          d={WORDMARK_PATH_D}
          stroke="none"
          fill="currentColor"
          fillRule="evenodd"
        />
      </svg>
    );
  },
);
