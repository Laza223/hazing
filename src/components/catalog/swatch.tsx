"use client";

import { Swatch } from "@/components/ui/swatch";
import { cn } from "@/lib/utils";

export interface ColorOption {
  value: string;
  hex: string | null;
}

export interface ColorSwatchSelectorProps {
  colors: ColorOption[];
  value: string | null;
  onChange: (value: string) => void;
  className?: string;
}

/**
 * ColorSwatchSelector — eje de color del selector de variante de dos ejes
 * (docs/spec/05-direccion-arte.md §7): swatches de 20 px + nombre en texto al
 * lado, nunca un thumbnail. Reusa el `Swatch` de ui/ (el punto redondo con su
 * propio estado de foco/selección) y le agrega el nombre en texto que exige
 * la spec.
 */
export function ColorSwatchSelector({
  colors,
  value,
  onChange,
  className,
}: ColorSwatchSelectorProps) {
  return (
    <div
      role="group"
      aria-label="Color"
      className={cn("flex flex-wrap gap-4", className)}
    >
      {colors.map((color) => {
        const selected = color.value === value;
        return (
          <div key={color.value} className="flex items-center gap-2">
            <Swatch
              hex={color.hex ?? "#FFFFFF"}
              size="md"
              selected={selected}
              label={color.value}
              onClick={() => onChange(color.value)}
            />
            <span
              className={cn("text-sm", selected ? "text-ink" : "text-ink-2")}
            >
              {color.value}
            </span>
          </div>
        );
      })}
    </div>
  );
}
