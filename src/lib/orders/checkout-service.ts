import { prisma, type PrismaTransactionClient } from "@/lib/prisma";
import { round2 } from "@/lib/money";
import { cartSubtotal } from "@/lib/cart/totals";
import { lineTotal } from "@/lib/cart/totals";
import { evaluateCoupon, type CouponEvalDb } from "@/lib/coupons/evaluate";
import { formatOrderNumber } from "@/lib/orders/order-number";
import { createPreference as realCreatePreference } from "@/lib/payments/mercadopago";
import {
  quoteShipping as realQuoteShipping,
  type ShippingQuote,
} from "@/lib/shipping/quote";
import { shippingQuoteDeps } from "@/lib/orders/checkout-data";
import type { CartLine } from "@/lib/cart/types";

export interface CheckoutLineInput {
  line: CartLine;
  productNameSnapshot: string;
  variantNameSnapshot: string | null;
  skuSnapshot: string | null;
  title: string;
}
export interface CheckoutAddress {
  cp: string;
  province?: string | null;
  street?: string;
  number?: string;
  floorApt?: string | null;
  city?: string;
  notes?: string | null;
}
export interface CreateCheckoutInput {
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  shippingMethod: "domicilio" | "sucursal" | "retiro";
  address: CheckoutAddress;
  lines: CheckoutLineInput[];
  couponCode?: string | null;
  customerId?: string | null;
  cartId?: string | null;
}

/** Superficie mínima de DB que necesita el servicio (para inyectar fakes en tests). */
export interface CheckoutDb extends CouponEvalDb {
  $transaction: <T>(
    fn: (tx: PrismaTransactionClient) => Promise<T>,
  ) => Promise<T>;
}
export interface CreateCheckoutDeps {
  db: CheckoutDb;
  nextOrderSeq: (tx: PrismaTransactionClient) => Promise<number>;
  createPreference: typeof realCreatePreference;
  quoteShipping: (
    input: Parameters<typeof realQuoteShipping>[0],
  ) => Promise<ShippingQuote>;
  appUrl: string;
  /** true si MP_ACCESS_TOKEN es de sandbox (TEST-...) — decide qué init_point devolver. */
  isSandboxToken: boolean;
  now?: Date;
}
export interface CreateCheckoutResult {
  orderId: string;
  orderNumber: string;
  initPoint: string;
}

/** Falla al crear la preference de MP (red, timeout, HTTP no-ok). El detalle técnico
 *  queda en `cause`; nunca debe llegar a la clienta. */
export class PaymentProviderError extends Error {
  constructor(cause: unknown) {
    super(
      "No pudimos conectar con Mercado Pago. Probá de nuevo en unos segundos.",
      {
        cause,
      },
    );
    this.name = "PaymentProviderError";
  }
}

/** El cupón del carrito ya no aplica al crear el pedido. `message` es apto para la clienta. */
export class CouponRejectedError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "CouponRejectedError";
  }
}

/** Lee la secuencia order_number_seq dentro de la tx (default real). */
async function defaultNextOrderSeq(
  tx: PrismaTransactionClient,
): Promise<number> {
  const rows = (await tx.$queryRawUnsafe(
    "SELECT nextval('order_number_seq') AS seq",
  )) as Array<{ seq: bigint | number }>;
  return Number(rows[0].seq);
}

export function defaultCheckoutDeps(appUrl: string): CreateCheckoutDeps {
  return {
    db: prisma as unknown as CheckoutDb,
    nextOrderSeq: defaultNextOrderSeq,
    createPreference: realCreatePreference,
    quoteShipping: (input) => realQuoteShipping(input, shippingQuoteDeps),
    appUrl,
    isSandboxToken: process.env.MP_ACCESS_TOKEN?.startsWith("TEST-") ?? false,
  };
}

export async function createCheckout(
  input: CreateCheckoutInput,
  deps: CreateCheckoutDeps,
): Promise<CreateCheckoutResult> {
  if (input.lines.length === 0) throw new Error("El carrito está vacío.");
  const now = deps.now ?? new Date();
  const cartLines = input.lines.map((l) => l.line);
  const subtotal = cartSubtotal(cartLines);

  // --- Envío: SIEMPRE recalculado en server con el método elegido (ver src/lib/shipping/quote.ts) ---
  const quote = await deps.quoteShipping({
    method: input.shippingMethod,
    cp: input.address.cp,
    province: input.address.province ?? null,
    subtotal,
    units: cartLines.reduce((n, l) => n + l.qty, 0),
  });

  // --- Cupón (misma evaluación que el carrito). Si no aplica se corta: nunca cobrar
  // distinto de lo que la clienta vio. ---
  let discount = 0;
  let freeShippingByCoupon = false;
  let couponId: string | null = null;
  if (input.couponCode) {
    const ev = await evaluateCoupon(deps.db, {
      code: input.couponCode,
      lines: cartLines,
      customerId: input.customerId,
      contactEmail: input.contactEmail,
      shippingCost: quote.cost,
      now,
    });
    // Rechazo transitorio (mínimo, categoría, total $0): el carrito ya lo muestra sin
    // descuento, así que se cobra sin cupón. Solo los permanentes cortan el checkout.
    if (!ev.ok && ev.permanent) throw new CouponRejectedError(ev.reason);
    // Sin beneficio (envío gratis con envío ya en $0): se ignora, no consume el uso.
    if (ev.ok && !ev.noBenefit) {
      discount = ev.discount;
      freeShippingByCoupon = ev.freeShipping;
      couponId = ev.couponId;
    }
  }
  const shippingCost = freeShippingByCoupon ? 0 : quote.cost;
  const total = round2(subtotal - discount + shippingCost);

  // --- Persistencia (tx) ---
  const order = await deps.db.$transaction(async (tx) => {
    const seq = await deps.nextOrderSeq(tx);
    const orderNumber = formatOrderNumber(seq);
    const created = await tx.order.create({
      data: {
        orderNumber,
        customerId: input.customerId ?? null,
        contactName: input.contactName,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone,
        shippingAddress: input.address as unknown as object,
        shippingMethod: input.shippingMethod,
        shippingZoneId: quote.zoneId,
        subtotal,
        shippingCost,
        discountTotal: discount,
        total,
        couponId,
        status: "pending_payment",
        items: {
          create: input.lines.map((l) => ({
            variantId: l.line.refId,
            productNameSnapshot: l.productNameSnapshot,
            variantNameSnapshot: l.variantNameSnapshot,
            skuSnapshot: l.skuSnapshot,
            unitPriceSnapshot: l.line.unitPrice,
            qty: l.line.qty,
            lineTotal: lineTotal(l.line),
          })),
        },
        payments: {
          create: { provider: "mercadopago", status: "pending", amount: total },
        },
      },
      include: { payments: true },
    });
    if (input.cartId) {
      // Precondición de estado: un doble envío del form no puede crear dos pedidos
      // (el throw revierte la tx, incluido el Order recién creado).
      const claimed = await tx.cart.updateMany({
        where: { id: input.cartId, status: "active" },
        data: { status: "ordered" },
      });
      if (claimed.count !== 1)
        throw new Error("Este carrito ya se está procesando.");
    }
    return created;
  });

  // --- Preference MP ---
  // CRÍTICO: los ítems enviados a MP DEBEN sumar exactamente `total` (lo que MP le cobra a la clienta).
  // Sin descuento: ítems de producto + línea de envío (todo positivo → suma = subtotal + envío = total).
  // Con descuento: una sola línea consolidada = total (MP no acepta líneas de precio negativo de forma confiable).
  const mpItems =
    discount > 0
      ? [
          {
            title: `Hazing · Pedido ${order.orderNumber}`,
            quantity: 1,
            unit_price: total,
          },
        ]
      : [
          ...input.lines.map((l) => ({
            title: l.title,
            quantity: l.line.qty,
            unit_price: l.line.unitPrice,
          })),
          ...(shippingCost > 0
            ? [{ title: "Envío", quantity: 1, unit_price: shippingCost }]
            : []),
        ];
  let preference: Awaited<ReturnType<typeof realCreatePreference>>;
  try {
    preference = await deps.createPreference({
      orderId: order.id,
      orderNumber: order.orderNumber,
      items: mpItems,
      payerEmail: input.contactEmail,
      appUrl: deps.appUrl,
      notificationUrl: `${deps.appUrl}/api/webhooks/mercadopago`,
    });
  } catch (cause) {
    // Compensación: la clienta no pierde el carrito y no queda un pedido huérfano.
    // Cupón/stock se consumen recién al aprobarse el pago, así que no hay nada más que soltar.
    try {
      await deps.db.$transaction(async (tx) => {
        await tx.order.updateMany({
          where: { id: order.id, status: "pending_payment" },
          data: { status: "cancelled" },
        });
        if (input.cartId)
          await tx.cart.updateMany({
            where: { id: input.cartId, status: "ordered" },
            data: { status: "active" },
          });
      });
    } catch (compensationError) {
      console.error(
        `[checkout] no se pudo compensar el pedido ${order.orderNumber}:`,
        compensationError,
      );
    }
    throw new PaymentProviderError(cause);
  }

  await deps.db.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: order.payments[0].id },
      data: { mpPreferenceId: preference.id },
    });
  });

  const initPoint =
    deps.isSandboxToken && preference.sandbox_init_point
      ? preference.sandbox_init_point
      : preference.init_point;

  return { orderId: order.id, orderNumber: order.orderNumber, initPoint };
}
