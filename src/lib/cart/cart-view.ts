import "server-only";
import { cache } from "react";
import { loadCurrentCart, type CartWithItems } from "@/lib/cart/cart-service";
import { cartSubtotal, cartItemCount } from "@/lib/cart/totals";
import { getCouponCodeFromCookie } from "@/lib/cart/cart-cookie";
import { getFreeShippingThreshold } from "@/lib/orders/checkout-data";
import { prisma } from "@/lib/prisma";
import { evaluateCoupon, type CouponEvalDb } from "@/lib/coupons/evaluate";
import { getCustomer } from "@/lib/customer/auth";
import type { CartLine } from "@/lib/cart/types";

export interface CartCouponPreview {
  code: string;
  discount: number;
  freeShipping: boolean;
}
export interface CartView {
  cart: CartWithItems | null;
  lines: CartLine[];
  count: number;
  subtotal: number;
  /** null = sin umbral de envío gratis configurado todavía. */
  threshold: number | null;
  coupon: CartCouponPreview | null;
  /** Por qué el cupón de la cookie no aplica (motivo en castellano); null si no hay. */
  couponRejected: { reason: string; permanent: boolean } | null;
}

/** Vista del carrito de la sesión (deduplicada por request con React cache). */
export const getCartView = cache(async (): Promise<CartView> => {
  const { cart, lines } = await loadCurrentCart();
  const subtotal = cartSubtotal(lines);
  const threshold = await getFreeShippingThreshold();

  let coupon: CartCouponPreview | null = null;
  let couponRejected: CartView["couponRejected"] = null;
  const code = await getCouponCodeFromCookie();
  if (code && lines.length > 0) {
    // Misma evaluación que usa el server al crear el pedido. Las Server Components no pueden
    // tocar cookies: si no aplica, `couponRejected` hace que el form limpie la cookie.
    const customer = await getCustomer();
    const ev = await evaluateCoupon(prisma as unknown as CouponEvalDb, {
      code,
      lines,
      customerId: customer?.id,
      contactEmail: customer?.email,
    });
    if (ev.ok) {
      coupon = {
        code,
        discount: ev.discount,
        freeShipping: ev.freeShipping,
      };
    } else {
      couponRejected = { reason: ev.reason, permanent: ev.permanent };
    }
  }
  return {
    cart,
    lines,
    count: cartItemCount(lines),
    subtotal,
    threshold,
    coupon,
    couponRejected,
  };
});
