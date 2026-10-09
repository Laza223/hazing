import { prisma, type PrismaTransactionClient } from "@/lib/prisma";
import { verifyMpSignature } from "@/lib/payments/signature";
import {
  getPayment as realGetPayment,
  mpStatusToPaymentStatus,
} from "@/lib/payments/mercadopago";
import {
  decideWebhookEffects,
  paymentStatusAdvances,
} from "@/lib/payments/webhook-effects";
import { applyPaidEffects, restockItems } from "@/lib/orders/stock-effects";
import { sendEmail as realSendEmail } from "@/lib/email/resend";
import {
  orderConfirmationEmail,
  newOrderAlertEmail,
  approvedOnClosedOrderEmail,
  type OrderEmailData,
} from "@/lib/email/templates";
import { toNumber } from "@/lib/catalog/pricing";
import type { OrderStatus } from "@prisma/client";
import type { Money } from "@/lib/catalog/types";

export interface ProcessWebhookInput {
  dataId: string;
  xSignature: string | null;
  xRequestId: string | null;
}
/** Interfaz mínima de la DB necesaria para el webhook (para inyectar fakes en tests). */
export interface WebhookDb {
  order: {
    findFirst: (args: Record<string, unknown>) => Promise<WebhookOrder | null>;
  };
  payment: {
    findFirst: (
      args: Record<string, unknown>,
    ) => Promise<{ id: string } | null>;
  };
  $transaction: <T>(
    fn: (tx: PrismaTransactionClient) => Promise<T>,
  ) => Promise<T>;
}

export interface WebhookOrderItem {
  id: string;
  variantId: string | null;
  productNameSnapshot: string;
  variantNameSnapshot: string | null;
  skuSnapshot: string | null;
  unitPriceSnapshot: Money;
  qty: number;
  lineTotal: Money;
}
export interface WebhookOrder {
  id: string;
  customerId: string | null;
  orderNumber: string;
  status: OrderStatus;
  couponId: string | null;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  shippingMethod: string;
  shippingAddress: unknown;
  subtotal: Money;
  shippingCost: Money;
  discountTotal: Money;
  total: Money;
  items: WebhookOrderItem[];
}

export interface ProcessWebhookDeps {
  db: WebhookDb;
  getPayment: typeof realGetPayment;
  sendEmail: typeof realSendEmail;
  verifySignature: (input: {
    xSignature: string | null;
    xRequestId: string | null;
    dataId: string;
    secret: string;
  }) => Promise<boolean>;
  secret: string;
  ownerEmail?: string;
  /** Punto de retiro de Ajustes; solo se consulta para pedidos con `retiro`. */
  getPickupAddress?: () => Promise<string | null>;
  now?: Date;
}
export interface ProcessWebhookResult {
  status: 200 | 401;
  detail: string;
}

export function defaultWebhookDeps(): ProcessWebhookDeps {
  return {
    db: prisma as unknown as WebhookDb,
    getPayment: realGetPayment,
    sendEmail: realSendEmail,
    verifySignature: verifyMpSignature,
    secret: process.env.MP_WEBHOOK_SECRET ?? "",
    ownerEmail: process.env.RESEND_OWNER_EMAIL ?? "",
    getPickupAddress: async () =>
      (
        await prisma.setting.findUnique({
          where: { id: "default" },
          select: { pickupAddress: true },
        })
      )?.pickupAddress ?? null,
  };
}

export async function processWebhook(
  input: ProcessWebhookInput,
  deps: ProcessWebhookDeps,
): Promise<ProcessWebhookResult> {
  // 1. Verificar firma (origen).
  const valid = await deps.verifySignature({
    xSignature: input.xSignature,
    xRequestId: input.xRequestId,
    dataId: input.dataId,
    secret: deps.secret,
  });
  if (!valid) return { status: 401, detail: "Firma inválida." };

  // 2. Consultar el pago a MP (fuente de verdad).
  const mpPayment = await deps.getPayment(input.dataId);
  const paymentStatus = mpStatusToPaymentStatus(mpPayment.status);
  const orderId = mpPayment.external_reference;
  if (!orderId) return { status: 200, detail: "Sin external_reference." };

  // 3. Cargar el pedido con items.
  const order = await deps.db.order.findFirst({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) return { status: 200, detail: "Pedido inexistente (ack)." };

  // 4. Decidir efectos (idempotente por Order.status). Si otro intento del pedido ya está
  // aprobado, un cancelled/refunded de ESTE pago no debe revertir el pedido.
  const otherApproved = await deps.db.payment.findFirst({
    where: {
      orderId: order.id,
      status: "approved",
      mpPaymentId: { not: String(mpPayment.id) },
    },
    select: { id: true },
  });
  const effects = decideWebhookEffects({
    currentOrderStatus: order.status,
    mpStatus: paymentStatus,
    hasCoupon: Boolean(order.couponId),
    otherApprovedPaymentExists: otherApproved != null,
  });

  let oversoldLines: Array<{ name: string }> = [];
  // Solo UN webhook gana la transición pending_payment → paid (guarda atómica dentro de la tx).
  // Los efectos "una sola vez" (stock, cupón, shipment, emails) se gatean por esto, no por el
  // estado leído antes de la tx — así MP entregando el mismo aviso en paralelo no doble-descuenta.
  let wonPaidTransition = false;
  // MP aprobó un pago sobre un pedido cancelado/refunded: la plata entró y el pedido NO se
  // reactiva (decisión de la dueña) → se avisa para devolver a mano en MercadoPago.
  let approvedOnClosedOrder: "cancelled" | "refunded" | null = null;
  const closedStatus = (s: OrderStatus): "cancelled" | "refunded" | null =>
    s === "cancelled" || s === "refunded" ? s : null;

  // 5. Aplicar en tx.
  await deps.db.$transaction(async (tx: PrismaTransactionClient) => {
    // Reconciliar el Payment: reusar la fila creada en el checkout (mpPaymentId aún null) o la ya
    // vinculada a este pago; nunca dejar un huérfano "pending" extra. Idempotente por mpPaymentId.
    const mpId = String(mpPayment.id);
    const amount = mpPayment.transaction_amount ?? toNumber(order.total);
    const existingPayment = await tx.payment.findFirst({
      where: {
        orderId: order.id,
        OR: [{ mpPaymentId: mpId }, { mpPaymentId: null }],
      },
      orderBy: { createdAt: "asc" },
    });
    // Dedupe del aviso: MP puede notificar varias veces el mismo pago ya aprobado.
    const alreadyApproved = existingPayment?.status === "approved";
    if (existingPayment) {
      // Monotonía: un webhook reordenado (ej. "in_process" viejo reintentado después de que ya
      // llegó "approved") no debe hacer retroceder el status — solo se pisa si avanza o iguala.
      const nextStatus = paymentStatusAdvances(
        existingPayment.status,
        effects.updatePaymentTo,
      )
        ? effects.updatePaymentTo
        : existingPayment.status;
      await tx.payment.update({
        where: { id: existingPayment.id },
        data: {
          mpPaymentId: mpId,
          status: nextStatus,
          amount,
          rawPayload: mpPayment as unknown as object,
        },
      });
    } else {
      await tx.payment.create({
        data: {
          orderId: order.id,
          provider: "mercadopago",
          mpPaymentId: mpId,
          status: effects.updatePaymentTo,
          amount,
          rawPayload: mpPayment as unknown as object,
        },
      });
    }

    if (effects.setOrderStatusTo === "paid") {
      // Guarda ATÓMICA: updateMany con precondición de estado. READ COMMITTED no serializa dos
      // findFirst previos, pero sí esta escritura condicional → solo una invocación obtiene count 1.
      const res = await tx.order.updateMany({
        where: { id: order.id, status: "pending_payment" },
        data: { status: "paid" },
      });
      wonPaidTransition = res.count === 1;
      if (!wonPaidTransition && !alreadyApproved) {
        // Perdió la guarda: ¿otro webhook ganó (paid) o el pedido se cerró entre la lectura y acá?
        const fresh = await tx.order.findFirst({
          where: { id: order.id },
          select: { status: true },
        });
        approvedOnClosedOrder = fresh ? closedStatus(fresh.status) : null;
      }
    } else if (effects.setOrderStatusTo) {
      // Misma guarda atómica que la transición a "paid": precondición sobre el status con el que
      // se calcularon los `effects` (order.status, leído fuera de la tx). Si otra invocación ya
      // movió el pedido a otro estado mientras tanto, esta escritura pierde la carrera (count 0)
      // en vez de pisar ciegamente — evita que un webhook "cancelled"/"refunded" desactualizado
      // sobrescriba un pedido que ya está "paid".
      const res = await tx.order.updateMany({
        where: { id: order.id, status: order.status },
        data: { status: effects.setOrderStatusTo },
      });
      // Reembolso/contracargo en MP sobre un pedido que ya descontó stock: reponer en la misma tx
      // (el estado cancelled/refunded es terminal, nadie más lo repondría). Solo si ganó la guarda.
      if (
        res.count === 1 &&
        (effects.setOrderStatusTo === "cancelled" ||
          effects.setOrderStatusTo === "refunded") &&
        // Solo paid/preparing: en shipped/delivered la mercadería ya salió, no se repone sola.
        (order.status === "paid" || order.status === "preparing")
      ) {
        await restockItems(tx, order.items);
      }
    }

    // approved pero el pedido ya estaba cancelado/refunded: no hay transición posible.
    if (
      paymentStatus === "approved" &&
      !effects.setOrderStatusTo &&
      !alreadyApproved
    ) {
      approvedOnClosedOrder = closedStatus(order.status);
    }

    // Efectos de una sola vez: SOLO si este webhook ganó la transición a paid.
    if (wonPaidTransition) {
      const { oversoldVariantIds } = await applyPaidEffects(
        tx,
        order,
        deps.now ?? new Date(),
      );
      if (oversoldVariantIds.length > 0) {
        oversoldLines = order.items
          .filter(
            (it) => it.variantId && oversoldVariantIds.includes(it.variantId),
          )
          .map((it) => ({
            name: it.variantNameSnapshot
              ? `${it.productNameSnapshot} (${it.variantNameSnapshot})`
              : it.productNameSnapshot,
          }));
      }
    }
  });

  // 6. Efectos externos (fuera de tx) — solo si ganamos la transición a paid (una sola vez).
  if (wonPaidTransition) {
    // Emails. Best-effort: el pago YA está confirmado en DB — un fallo de Resend acá no debe
    // voltear el webhook (si no, MP reintenta indefinidamente sobre un pago que ya es idempotente,
    // en vez de cerrar con 200).
    try {
      const emailData: OrderEmailData = {
        orderNumber: order.orderNumber,
        contactName: order.contactName,
        contactEmail: order.contactEmail,
        items: order.items.map((it) => ({
          name: it.productNameSnapshot,
          variantName: it.variantNameSnapshot,
          qty: it.qty,
          lineTotal: toNumber(it.lineTotal),
        })),
        subtotal: toNumber(order.subtotal),
        shippingCost: toNumber(order.shippingCost),
        discountTotal: toNumber(order.discountTotal),
        total: toNumber(order.total),
        shippingMethod: order.shippingMethod,
        pickupAddress:
          order.shippingMethod === "retiro" && deps.getPickupAddress
            ? await deps.getPickupAddress()
            : null,
        // Defensa: monto realmente acreditado por MP → la alerta a la dueña flaggea si no coincide con el total.
        amountPaid: mpPayment.transaction_amount ?? undefined,
      };
      const customer = orderConfirmationEmail(emailData);
      await deps.sendEmail({
        to: order.contactEmail,
        subject: customer.subject,
        html: customer.html,
        text: customer.text,
      });
      if (deps.ownerEmail) {
        const owner = newOrderAlertEmail({
          ...emailData,
          oversoldLines: oversoldLines.length ? oversoldLines : undefined,
        });
        await deps.sendEmail({
          to: deps.ownerEmail,
          subject: owner.subject,
          html: owner.html,
          text: owner.text,
        });
      } else {
        console.error(
          `[webhook] RESEND_OWNER_EMAIL no configurada: la dueña no recibió el aviso del pedido ${order.orderNumber}`,
        );
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(
        `[webhook] envío de emails falló (pedido ${order.orderNumber}):`,
        msg,
      );
    }
  }

  // Aviso a la dueña (best-effort: el estado ya quedó persistido; un fallo de mail no voltea el webhook).
  if (approvedOnClosedOrder) {
    const amount = mpPayment.transaction_amount ?? toNumber(order.total);
    console.error(
      `[webhook] pago aprobado sobre pedido ${approvedOnClosedOrder === "cancelled" ? "cancelado" : "reembolsado"} ${order.orderNumber} (MP pago ${mpPayment.id}, monto ${amount}): devolver a mano en MercadoPago`,
    );
    try {
      if (deps.ownerEmail) {
        const owner = approvedOnClosedOrderEmail({
          orderNumber: order.orderNumber,
          orderStatus: approvedOnClosedOrder,
          amount,
          mpPaymentId: String(mpPayment.id),
        });
        await deps.sendEmail({
          to: deps.ownerEmail,
          subject: owner.subject,
          html: owner.html,
          text: owner.text,
        });
      } else {
        console.error(
          `[webhook] RESEND_OWNER_EMAIL no configurada: la dueña no recibió el aviso de cobro sobre ${order.orderNumber}`,
        );
      }
    } catch (e) {
      console.error(
        `[webhook] aviso de cobro sobre pedido cerrado falló (pedido ${order.orderNumber}):`,
        e instanceof Error ? e.message : String(e),
      );
    }
  }

  return {
    status: 200,
    detail: wonPaidTransition
      ? "paid"
      : effects.setOrderStatusTo === "paid"
        ? "ya pagado (idempotente)"
        : (effects.setOrderStatusTo ?? "sin cambio"),
  };
}
