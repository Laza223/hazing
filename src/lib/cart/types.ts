/**
 * Línea de carrito "resuelta" a números para cálculos puros (sin DB ni red).
 * Sin combos (decisión de Lazar 2026-09-03, ver docs/spec/02-funcional.md) — `kind`
 * queda como literal único por si se agregan en el futuro, sin romper el tipo.
 * Sin `weightGr` — el envío es 100% manual por zona (ShippingZone), no depende del
 * peso de la línea (delta vs. glamify, ver docs/spec/00-handoff.md §2.2).
 */
export interface CartLine {
  /** id de la línea (cartItemId en runtime; arbitrario en tests). */
  id: string;
  kind: "variant";
  /** = variantId. */
  refId: string;
  /** Precio unitario efectivo en ARS (priceOverride ?? basePrice). */
  unitPrice: number;
  qty: number;
  /** Metadata para cupones scope product/category. */
  productId?: string | null;
  categoryId?: string | null;
}
