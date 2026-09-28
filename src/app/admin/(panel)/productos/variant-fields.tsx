"use client";

import { useState } from "react";
import { Plus, Trash2, ShoppingBag } from "lucide-react";
import type { SizeSystem } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { TextInput } from "@/components/ui/text-input";
import { SIZE_SCALES } from "@/lib/catalog/sizes";
import type { VariantFormInput } from "@/lib/admin/products/validation";
import {
  rebuildVariantGrid,
  variantKey,
  type VariantColorInput,
} from "@/lib/admin/products/variant-grid";

export interface VariantFieldsProps {
  sizeSystem: SizeSystem;
  variants: VariantFormInput[];
  onChange: (variants: VariantFormInput[]) => void;
}

type ColorInput = VariantColorInput;
const keyOf = variantKey;
const rebuild = rebuildVariantGrid;

export function VariantFields({
  sizeSystem,
  variants,
  onChange,
}: VariantFieldsProps) {
  const scale = SIZE_SCALES[sizeSystem];
  const [selectedSizes, setSelectedSizes] = useState<string[]>(() =>
    [...new Set(variants.map((v) => v.size))].filter((s) => scale.includes(s)),
  );
  const [colors, setColors] = useState<ColorInput[]>(() => {
    const seen = new Map<string, ColorInput>();
    for (const v of variants) {
      if (!seen.has(v.color))
        seen.set(v.color, { name: v.color, swatchHex: v.swatchHex });
    }
    return [...seen.values()];
  });
  const [newColorName, setNewColorName] = useState("");
  const [newColorHex, setNewColorHex] = useState("");

  const apply = (sizes: string[], cols: ColorInput[]) => {
    setSelectedSizes(sizes);
    setColors(cols);
    onChange(rebuild(sizes, cols, variants));
  };

  const toggleSize = (size: string) => {
    const next = selectedSizes.includes(size)
      ? selectedSizes.filter((s) => s !== size)
      : [...selectedSizes, size];
    apply(next, colors);
  };

  const addColor = () => {
    const name = newColorName.trim();
    if (!name) return;
    if (colors.some((c) => c.name.toLowerCase() === name.toLowerCase())) return;
    const hex = newColorHex.trim();
    const next = [...colors, { name, swatchHex: hex === "" ? null : hex }];
    setNewColorName("");
    setNewColorHex("");
    apply(selectedSizes, next);
  };

  const removeColor = (name: string) =>
    apply(
      selectedSizes,
      colors.filter((c) => c.name !== name),
    );

  const updateVariant = (
    size: string,
    color: string,
    patch: Partial<VariantFormInput>,
  ) => {
    onChange(
      variants.map((v) =>
        v.size === size && v.color === color ? { ...v, ...patch } : v,
      ),
    );
  };

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>Talles disponibles</Label>
        <p className="text-xs text-ink-3">
          Tildá los talles en los que vas a tener stock de este producto.
        </p>
        <div className="flex flex-wrap gap-3">
          {scale.map((size) => (
            <label
              key={size}
              className="flex h-10 cursor-pointer items-center gap-2 rounded-control border border-line px-3 text-sm text-ink"
            >
              <Checkbox
                checked={selectedSizes.includes(size)}
                onChange={() => toggleSize(size)}
              />
              {size}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Colores</Label>
        <p className="text-xs text-ink-3">
          Agregá cada color por nombre. El swatch (hex) es opcional, solo para
          mostrar un punto de color.
        </p>
        {colors.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {colors.map((c) => (
              <span
                key={c.name}
                className="flex h-10 items-center gap-2 rounded-control border border-line px-3 text-sm text-ink"
              >
                {c.swatchHex ? (
                  <span
                    aria-hidden
                    className="size-3.5 rounded-full border border-line"
                    style={{ backgroundColor: c.swatchHex }}
                  />
                ) : null}
                {c.name}
                <button
                  type="button"
                  onClick={() => removeColor(c.name)}
                  aria-label={`Quitar color ${c.name}`}
                  className="text-ink-3 outline-none transition-colors duration-ui ease-ui focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                >
                  <Trash2 className="size-3.5" aria-hidden />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-end gap-2">
          <TextInput
            id="new-color-name"
            label="Nombre del color"
            value={newColorName}
            onChange={(e) => setNewColorName(e.target.value)}
            placeholder="Negro"
            className="w-40"
          />
          <TextInput
            id="new-color-hex"
            label="Hex (opcional)"
            value={newColorHex}
            onChange={(e) => setNewColorHex(e.target.value)}
            placeholder="#171717"
            className="w-28"
          />
          <Button type="button" variant="outline" size="sm" onClick={addColor}>
            <Plus className="size-4" aria-hidden /> Agregar color
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Variantes generadas</Label>
        {variants.length === 0 ? (
          <div className="rounded-control border border-dashed border-line p-6 text-center text-sm text-ink-3">
            <ShoppingBag
              className="mx-auto mb-2 size-6 text-ink-4"
              aria-hidden
            />
            Elegí al menos un talle y un color para generar las variantes.
          </div>
        ) : (
          <div className="space-y-3">
            {variants.map((v) => (
              <div
                key={keyOf(v.size, v.color)}
                className="grid grid-cols-2 gap-3 rounded-control border border-line p-4 sm:grid-cols-4"
              >
                <div className="col-span-2 flex items-center gap-2 text-sm font-medium text-ink sm:col-span-4">
                  {v.size} · {v.color}
                  {v.sku ? (
                    <span className="text-xs font-normal text-ink-4">
                      ({v.sku})
                    </span>
                  ) : null}
                </div>
                <TextInput
                  id={`stock-${keyOf(v.size, v.color)}`}
                  label="Stock"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={v.stock}
                  onChange={(e) =>
                    updateVariant(v.size, v.color, {
                      stock:
                        e.target.value === "" ? "" : Number(e.target.value),
                    })
                  }
                />
                <TextInput
                  id={`low-${keyOf(v.size, v.color)}`}
                  label="Aviso de bajo stock"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={v.lowStockThreshold}
                  onChange={(e) =>
                    updateVariant(v.size, v.color, {
                      lowStockThreshold:
                        e.target.value === "" ? "" : Number(e.target.value),
                    })
                  }
                />
                <TextInput
                  id={`price-${keyOf(v.size, v.color)}`}
                  label="Precio especial (opcional)"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  value={v.priceOverride ?? ""}
                  onChange={(e) =>
                    updateVariant(v.size, v.color, {
                      priceOverride:
                        e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                  placeholder="Usa el precio base"
                />
                <div className="flex items-end gap-2 pb-2.5">
                  <Switch
                    id={`active-${keyOf(v.size, v.color)}`}
                    checked={v.active}
                    onCheckedChange={(checked) =>
                      updateVariant(v.size, v.color, { active: checked })
                    }
                  />
                  <Label
                    htmlFor={`active-${keyOf(v.size, v.color)}`}
                    className="cursor-pointer"
                  >
                    Activa
                  </Label>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
