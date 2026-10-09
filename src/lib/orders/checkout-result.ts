import type { OrderStatus, PaymentStatus } from "@prisma/client";

/**
 * Mapeo de estado para `/checkout/gracias` (docs/spec/08-checkout.md §3.5).
 * La fuente de verdad es SIEMPRE la DB (el webhook), nunca el query param de
 * MP — por eso esto solo mira `Order.status` + el último `Payment`.
 */
export type CheckoutResultStatus =
  | "paid"
  | "pending"
  | "failed"
  /** Pedido cancelado (venció) pero MP aprobó un pago: se devuelve a mano. */
  | "paid_on_cancelled";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** El `?pedido=` de /checkout/gracias tiene que ser un UUID (Order.id) — un
 *  orderNumber (HZG-…) u otro valor arbitrario no debe ni pegarle a la DB. */
export function isOrderId(value: string | undefined): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

const PAID_STATUSES: OrderStatus[] = [
  "paid",
  "preparing",
  "shipped",
  "delivered",
];
const FAILED_ORDER_STATUSES: OrderStatus[] = ["cancelled", "refunded"];
const FAILED_PAYMENT_STATUSES: PaymentStatus[] = ["rejected", "cancelled"];

export interface ResultOrderLike {
  status: OrderStatus;
}
export interface ResultPaymentLike {
  status: PaymentStatus;
}

export function resolveCheckoutResultStatus(
  order: ResultOrderLike,
  lastPayment: ResultPaymentLike | null,
  hasApprovedPayment = false,
): CheckoutResultStatus {
  if (PAID_STATUSES.includes(order.status)) return "paid";
  if (order.status === "cancelled" && hasApprovedPayment)
    return "paid_on_cancelled";
  if (FAILED_ORDER_STATUSES.includes(order.status)) return "failed";
  if (lastPayment && FAILED_PAYMENT_STATUSES.includes(lastPayment.status))
    return "failed";
  return "pending";
}

/** Reconstruye el checkout de MP a partir del `mpPreferenceId` guardado (no hay columna de
 *  `init_point` en `Payment` — ver docs/spec/08-checkout.md §3, punto 3 del checklist). */
export function buildRetryUrl(mpPreferenceId: string): string {
  return `https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=${mpPreferenceId}`;
}
