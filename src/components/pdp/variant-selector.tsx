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
  /** Talle único: se muestra como dato, sin selector. */
  singleSizeLabel?: string | null;
  /** Color único: se muestra como dato (punto + nombre), sin selector. */
  singleColor?: ColorOption | null;
}

/**
 * VariantSelector — selector de variante de dos ejes de la PDP
 * (docs/spec/05-direccion-arte.md §7, docs/spec/06-storefront.md §3.5): color
 * primero (swatches + nombre en texto), talle después (`SizeSelector`,
 * ordenado por `sortSizes()`). Producto de un solo color → el color como dato, sin selector;
 * `one_size` → sin selector, solo el talle como texto. Puramente presentacional: la selección, el
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
  singleSizeLabel = null,
  singleColor = null,
}: VariantSelectorProps) {
  const showSingleSize = !showSize && !!singleSizeLabel;
  const showSingleColor = !showColor && !!singleColor;
  if (!showColor && !showSize && !showSingleSize && !showSingleColor)
    return null;

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
      {showSingleColor && (
        <div>
          <p className="tracking-caps-sm mb-2 text-xs uppercase text-ink-2">
            Color
          </p>
          <p className="flex items-center gap-2 text-sm text-ink">
            <span
              aria-hidden
              className="size-5 rounded-full border border-line"
              style={{ backgroundColor: singleColor.hex ?? "#FFFFFF" }}
            />
            {singleColor.value}
          </p>
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
      {showSingleSize && (
        <div>
          <p className="tracking-caps-sm mb-2 text-xs uppercase text-ink-2">
            Talle
          </p>
          <p className="text-sm text-ink">{singleSizeLabel}</p>
        </div>
      )}
    </div>
  );
}
