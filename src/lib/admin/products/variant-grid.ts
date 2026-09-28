import type { VariantFormInput } from "@/lib/admin/products/validation";

/** Color agregado por Dana en el form: nombre + swatch opcional. */
export interface VariantColorInput {
  name: string;
  swatchHex: string | null;
}

export function variantKey(size: string, color: string): string {
  return `${size}::${color.trim().toLowerCase()}`;
}

/** Fila en blanco para una combinación (talle, color) que Dana recién tildó — nunca existió en
 *  DB o salió de la grilla y vuelve a entrar: "reactivación explícita", siempre `active: true`
 *  aunque la fila que reemplaza esté desactivada en DB (el servicio la reactiva por `(size,
 *  color)`, ver `src/lib/admin/products/service.ts`). */
export function blankVariant(
  size: string,
  color: string,
  swatchHex: string | null,
  order: number,
): VariantFormInput {
  return {
    size,
    color,
    swatchHex,
    sku: "",
    stock: "",
    lowStockThreshold: "",
    priceOverride: null,
    image: null,
    active: true,
    order,
  };
}

/**
 * Recalcula la grilla completa (talle × color) a partir de los talles/colores tildados.
 * Preserva id, SKU, stock y `active` real de las filas que ya existían para esa combinación
 * exacta en `current` (el estado del form, que en el mount inicial trae TODAS las variantes de
 * DB, activas e inactivas — así el switch "Activa" no se pierde entre guardados). Una
 * combinación que no estaba en `current` es nueva (Dana la acaba de tildar): entra siempre con
 * `active: true`, sea o no una reactivación de una fila desactivada en DB.
 */
export function rebuildVariantGrid(
  sizes: string[],
  colors: VariantColorInput[],
  current: VariantFormInput[],
): VariantFormInput[] {
  const byKey = new Map(current.map((v) => [variantKey(v.size, v.color), v]));
  const next: VariantFormInput[] = [];
  let order = 0;
  for (const size of sizes) {
    for (const color of colors) {
      const name = color.name.trim();
      if (!name) continue;
      const existing = byKey.get(variantKey(size, name));
      next.push(
        existing
          ? { ...existing, order: order++ }
          : blankVariant(size, name, color.swatchHex, order++),
      );
    }
  }
  return next;
}
