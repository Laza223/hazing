"use client";

import { cn } from "@/lib/utils";

export interface SizeOption {
  value: string;
  available: boolean;
}

export interface SizeSelectorProps {
  sizes: SizeOption[];
  value: string | null;
  onChange: (value: string) => void;
  className?: string;
}

/**
 * SizeSelector — botones de texto, radio `control` (docs/spec/05-direccion-arte.md
 * §7). Seleccionado = invertido (`bg-ink text-paper`). No disponible = tachado
 * en `ink-3` + `disabled`.
 *
 * Decisión de accesibilidad: el talle agotado usa el atributo `disabled`
 * nativo (pedido explícito del brief — "el agotado va tachado + 'Agotado'"),
 * lo que le quita el foco de teclado. Por eso el texto "Agotado" NO puede
 * depender de `:hover`/`:focus` (revisión adversarial de 5.1b: en mobile no
 * existe `:hover` real, así que una clienta en el celular nunca lo vería).
 * Se resuelve con una leyenda SIEMPRE en el flujo del documento, debajo del
 * botón — invisible (pero reservando el espacio, para no desalinear la fila)
 * cuando el talle SÍ está disponible, y oculta a lectores de pantalla en ese
 * caso (`aria-hidden`) para no anunciar "Agotado" en un talle que no lo está.
 */
export function SizeSelector({
  sizes,
  value,
  onChange,
  className,
}: SizeSelectorProps) {
  return (
    <div
      role="group"
      aria-label="Talle"
      className={cn("flex flex-wrap gap-2", className)}
    >
      {sizes.map((size) => {
        const selected = size.value === value;
        return (
          <div key={size.value} className="flex flex-col items-center gap-1">
            <button
              type="button"
              disabled={!size.available}
              aria-pressed={selected}
              onClick={() => onChange(size.value)}
              className={cn(
                "h-10 min-w-10 rounded-control border border-line px-3 text-sm text-ink outline-none transition-colors duration-ui ease-ui focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
                selected && "border-ink bg-ink text-paper",
                !size.available && "cursor-not-allowed text-ink-3 line-through",
              )}
            >
              {size.value}
            </button>
            <span
              aria-hidden={size.available}
              className={cn(
                "text-[10px] normal-case text-ink-3",
                size.available && "invisible",
              )}
            >
              Agotado
            </span>
          </div>
        );
      })}
    </div>
  );
}
