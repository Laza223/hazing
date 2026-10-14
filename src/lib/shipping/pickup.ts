import { round2 } from "@/lib/money";

/**
 * Descuento por retiro en el showroom (decisión de la dueña, 2026-10-13):
 * 36% sobre los productos, no se suma con cupones. Compartido entre el
 * checkout (cliente) y `createCheckout` (server) para que lo que se ve sea
 * lo que se cobra.
 */
export const PICKUP_DISCOUNT_RATE = 0.36;
export const PICKUP_DISCOUNT_LABEL = "Retiro en showroom (−36%)";

/** Etiqueta de la línea de descuento de un pedido ya creado: en retiro sin
 *  cupón el descuento es el de showroom (pedidos viejos con cupón quedan
 *  como "Descuento"). */
export function orderDiscountLabel(
  shippingMethod: string,
  hasCoupon: boolean,
): string {
  return shippingMethod === "retiro" && !hasCoupon
    ? PICKUP_DISCOUNT_LABEL
    : "Descuento";
}

export function pickupDiscount(subtotal: number): number {
  return round2(subtotal * PICKUP_DISCOUNT_RATE);
}
