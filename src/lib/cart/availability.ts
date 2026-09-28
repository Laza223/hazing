/** Mínimo de una línea de carrito que decide si todavía se puede comprar. */
export interface AvailabilityLine {
  qty: number;
  variant: {
    active: boolean;
    stock: number;
    product: { active: boolean; deletedAt: Date | null };
  };
}

/**
 * Líneas que ya no se pueden pagar: variante o producto desactivado/borrado
 * después de agregarlos al carrito, o stock que bajó de la cantidad pedida.
 * Se chequea al crear la orden, antes de mandar a la clienta a MercadoPago
 * (el webhook tiene la guarda atómica de stock, pero para entonces ya cobró).
 */
export function unavailableLines<T extends AvailabilityLine>(lines: T[]): T[] {
  return lines.filter(
    (l) =>
      !l.variant.active ||
      !l.variant.product.active ||
      l.variant.product.deletedAt !== null ||
      l.variant.stock < l.qty,
  );
}
