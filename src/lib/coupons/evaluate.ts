import { round2 } from "@/lib/money";
import { cartSubtotal } from "@/lib/cart/totals";
import { ORDER_EXPIRY_HOURS } from "@/lib/orders/expiry";
import { validateCoupon, applyCoupon } from "@/lib/coupons/apply";
import type { CartLine } from "@/lib/cart/types";

/** Interfaz mínima de coupon row necesaria para validar y aplicar. */
export interface CouponRow {
  id: string;
  code: string;
  type: "percentage" | "fixed" | "free_shipping";
  value: number | string;
  scope: "all" | "category" | "product";
  scopeId: string | null;
  active: boolean;
  minSubtotal: number | string | null;
  validFrom: Date | null;
  validTo: Date | null;
  maxUses: number | null;
  usedCount: number;
  perCustomerLimit: number | null;
}

/** Superficie mínima de DB para evaluar un cupón (inyectable en tests). */
export interface CouponEvalDb {
  coupon: {
    findUnique: (args: {
      where: { code: string };
    }) => Promise<CouponRow | null>;
  };
  couponRedemption: {
    findUnique: (args: {
      where: { customerId_couponId: { customerId: string; couponId: string } };
    }) => Promise<{ redeemedCount: number } | null>;
  };
  order: {
    count: (args: { where: Record<string, unknown> }) => Promise<number>;
  };
}

export interface EvaluateCouponInput {
  code: string;
  lines: CartLine[];
  customerId?: string | null;
  contactEmail?: string | null;
  /** Costo de envío ya cotizado (solo checkout): con envío en $0 el cupón de envío gratis queda `noBenefit`. */
  shippingCost?: number;
  now?: Date;
}
export type CouponEvaluation =
  | {
      ok: true;
      couponId: string;
      code: string;
      discount: number;
      freeShipping: boolean;
      /** true = aplicable pero no cambia lo cobrado (envío gratis con envío ya en $0): no se asocia al pedido. */
      noBenefit: boolean;
    }
  | {
      ok: false;
      reason: string;
      /** true = el cupón no sirve más (inexistente, vencido, inactivo, tope agotado): se puede borrar la cookie.
       *  false = depende del carrito actual (mínimo, categoría, total $0): se conserva. */
      permanent: boolean;
    };

const COUNTED_PAID_STATUSES = ["paid", "preparing", "shipped", "delivered"];

/**
 * Única fuente de verdad de "¿este cupón aplica a este carrito?": la usan el carrito, el
 * checkout y la acción de aplicar. Lo que ve la clienta es lo que cobra el server.
 * maxUses cuenta también pedidos `pending_payment` vigentes de otras clientas.
 */
export async function evaluateCoupon(
  db: CouponEvalDb,
  input: EvaluateCouponInput,
): Promise<CouponEvaluation> {
  const now = input.now ?? new Date();
  const coupon = await db.coupon.findUnique({ where: { code: input.code } });
  if (!coupon)
    return { ok: false, reason: "Cupón inexistente.", permanent: true };

  const cutoff = new Date(now.getTime() - ORDER_EXPIRY_HOURS * 3600_000);
  const pendingVigente = {
    status: "pending_payment",
    createdAt: { gte: cutoff },
  };

  const email = input.contactEmail?.trim().toLowerCase();
  const identities: Record<string, unknown>[] = [];
  if (input.customerId) identities.push({ customerId: input.customerId });
  if (email)
    identities.push({ contactEmail: { equals: email, mode: "insensitive" } });

  // maxUses: usos efectivos + pendientes vigentes de OTRAS clientas (los pendientes propios
  // abandonados no deben bloquear el reintento).
  let usedCount = coupon.usedCount;
  if (coupon.maxUses != null) {
    const pendingWhere = { couponId: coupon.id, ...pendingVigente };
    let pending = await db.order.count({ where: pendingWhere });
    // Restar los propios con una query aparte: `NOT (customerId = x OR ...)` descarta las
    // filas con customerId NULL (invitadas) por la lógica de tres valores de SQL.
    if (identities.length > 0)
      pending -= await db.order.count({
        where: { ...pendingWhere, OR: identities },
      });
    usedCount += pending;
  }

  // perCustomerLimit: solo usos efectivos (canjes y pedidos pagados), por customerId o email.
  let customerRedemptions = 0;
  if (coupon.perCustomerLimit != null) {
    if (input.customerId) {
      const r = await db.couponRedemption.findUnique({
        where: {
          customerId_couponId: {
            customerId: input.customerId,
            couponId: coupon.id,
          },
        },
      });
      customerRedemptions = r?.redeemedCount ?? 0;
    }
    if (identities.length > 0) {
      const orders = await db.order.count({
        where: {
          couponId: coupon.id,
          status: { in: COUNTED_PAID_STATUSES },
          OR: identities,
        },
      });
      customerRedemptions = Math.max(customerRedemptions, orders);
    }
  }

  const subtotal = cartSubtotal(input.lines);
  const v = validateCoupon(
    { ...coupon, usedCount },
    { subtotal, now, customerRedemptions },
  );
  if (!v.ok) {
    const belowMin =
      coupon.minSubtotal != null && subtotal < Number(coupon.minSubtotal);
    return { ok: false, reason: v.reason, permanent: !belowMin };
  }

  const res = applyCoupon(coupon, input.lines);
  if (res.discount === 0 && !res.freeShipping) {
    return {
      ok: false,
      reason: "El cupón no aplica a los productos de tu carrito.",
      permanent: false,
    };
  }
  // MP no cobra $0: un cupón que deja el producto sin costo no se puede usar.
  if (round2(subtotal - res.discount) <= 0) {
    return {
      ok: false,
      reason: "Este cupón no se puede usar en esta compra.",
      permanent: false,
    };
  }
  return {
    ok: true,
    couponId: coupon.id,
    code: coupon.code,
    discount: res.discount,
    freeShipping: res.freeShipping,
    noBenefit: res.freeShipping && input.shippingCost === 0,
  };
}
