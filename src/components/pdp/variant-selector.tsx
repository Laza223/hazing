import {
  SizeSelector,
  type SizeOption,
} from "@/components/catalog/size-selector";
import {
  ColorSwatchSelector,
  type ColorOption,
} from "@/components/catalog/swatch";

export interface VariantSelectorProps {
  colors: ColorOption[];
  showColor: boolean;
  selectedColor: string | null;
  onColorChange: (value: string) => void;
  sizes: SizeOption[];
  showSize: boolean;
  selectedSize: string | null;
  onSizeChange: (value: string) => void;
}

/**
 * VariantSelector — selector de variante de dos ejes de la PDP
 * (docs/spec/05-direccion-arte.md §7, docs/spec/06-storefront.md §3.5): color
 * primero (swatches + nombre en texto), talle después (`SizeSelector`,
 * ordenado por `sortSizes()`). Producto de un solo color → sin eje de color;
 * `one_size` → sin eje de talle. Puramente presentacional: la selección, el
 * cómputo de disponibilidad y el precio los resuelve `AddToCart` (el padre).
 */
export function VariantSelector({
  colors,
  showColor,
  selectedColor,
  onColorChange,
  sizes,
  showSize,
  selectedSize,
  onSizeChange,
}: VariantSelectorProps) {
  if (!showColor && !showSize) return null;

  return (
    <div className="space-y-5">
      {showColor && (
        <div>
          <p className="tracking-caps-sm mb-2 text-xs uppercase text-ink-2">
            Color
          </p>
          <ColorSwatchSelector
            colors={colors}
            value={selectedColor}
            onChange={onColorChange}
          />
        </div>
      )}
      {showSize && (
        <div>
          <p className="tracking-caps-sm mb-2 text-xs uppercase text-ink-2">
            Talle
          </p>
          <SizeSelector
            sizes={sizes}
            value={selectedSize}
            onChange={onSizeChange}
          />
        </div>
      )}
    </div>
  );
}
