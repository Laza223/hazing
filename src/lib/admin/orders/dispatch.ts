import { prisma, type PrismaTransactionClient } from "@/lib/prisma";
import { canTransition } from "@/lib/orders/state-machine";
import { OrderStatusRaceError } from "@/lib/admin/orders/service";
import { sendEmail as realSendEmail } from "@/lib/email/resend";
import { shipmentDispatchedEmail } from "@/lib/email/templates";
import type { OrderStatus, ShipmentStatus } from "@prisma/client";

/**
 * Despacho manual (ADR 0004): la dueña despacha con el courier que quiera y acá carga
 * empresa, código y link libres. Pasa el pedido a `shipped` respetando la state-machine
 * (paid → preparing → shipped), crea/actualiza el `Shipment` y avisa a la clienta.
 */

export interface DispatchInput {
  carrier: string;
  trackingNumber: string;
  trackingUrl?: string | null;
}

export interface DispatchOrder {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  shippingMethod: string;
  shippingCost: number | string | { toString(): string };
  contactName: string;
  contactEmail: string;
  shipment: {
    status: ShipmentStatus;
    trackingNumber: string | null;
  } | null;
}

export interface DispatchDb {
  order: {
    findUnique: (args: {
      where: { id: string };
      include: { shipment: true };
    }) => Promise<DispatchOrder | null>;
  };
  $transaction: <T>(
    fn: (tx: PrismaTransactionClient) => Promise<T>,
  ) => Promise<T>;
}

export interface DispatchDeps {
  db: DispatchDb;
  sendEmail: typeof realSendEmail;
}

export function defaultDispatchDeps(): DispatchDeps {
  return { db: prisma as unknown as DispatchDb, sendEmail: realSendEmail };
}

export type ParsedDispatch =
  | { ok: true; carrier: string; trackingNumber: string; trackingUrl: string }
  | { ok: false; error: string };

/** Normaliza y valida los campos del form. `trackingUrl` vacío = sin link. */
export function parseDispatchInput(raw: DispatchInput): ParsedDispatch {
  const carrier = raw.carrier.trim();
  const trackingNumber = raw.trackingNumber.trim();
  const trackingUrl = (raw.trackingUrl ?? "").trim();
  if (!carrier) return { ok: false, error: "Ingresá la empresa de envío." };
  if (!trackingNumber)
    return { ok: false, error: "Ingresá el código de seguimiento." };
  if (carrier.length > 80 || trackingNumber.length > 80)
    return { ok: false, error: "Empresa o código demasiado largos." };
  if (trackingUrl) {
    let isHttps = false;
    try {
      isHttps = new URL(trackingUrl).protocol === "https:";
    } catch {
      isHttps = false;
    }
    if (!isHttps || trackingUrl.length > 500)
      return {
        ok: false,
        error:
          "El link de seguimiento debe ser una URL que empiece con https://",
      };
  }
  return { ok: true, carrier, trackingNumber, trackingUrl };
}

const DISPATCHABLE: OrderStatus[] = ["paid", "preparing", "shipped"];

export async function markOrderDispatched(
  orderId: string,
  raw: DispatchInput,
  deps: DispatchDeps,
): Promise<{ id: string; emailSent: boolean }> {
  const parsed = parseDispatchInput(raw);
  if (!parsed.ok) throw new Error(parsed.error);
  const { carrier, trackingNumber, trackingUrl } = parsed;

  const order = await deps.db.order.findUnique({
    where: { id: orderId },
    include: { shipment: true },
  });
  if (!order) throw new Error("El pedido no existe.");
  if (order.shippingMethod === "retiro")
    throw new Error("Los retiros en Luján no se despachan.");
  if (!DISPATCHABLE.includes(order.status))
    throw new Error(
      "Solo se puede despachar un pedido pagado o en preparación.",
    );

  const firstDispatch = order.status !== "shipped";
  // paid pasa por preparing: ambas transiciones tienen que ser válidas.
  if (
    order.status === "paid" &&
    !(
      canTransition("paid", "preparing") &&
      canTransition("preparing", "shipped")
    )
  )
    throw new Error("Transición de estado inválida.");
  if (order.status === "preparing" && !canTransition("preparing", "shipped"))
    throw new Error("Transición de estado inválida.");

  const prev = order.shipment;
  // Si el envío ya avanzó (in_transit, delivered...) no se retrocede el estado.
  const status: ShipmentStatus =
    prev && prev.status !== "pending" && prev.status !== "ready"
      ? prev.status
      : "dispatched";
  const data = {
    carrier,
    trackingNumber,
    trackingUrl: trackingUrl || null,
    status,
  };

  await deps.db.$transaction(async (tx) => {
    if (firstDispatch) {
      const res = await tx.order.updateMany({
        where: { id: order.id, status: order.status },
        data: { status: "shipped" },
      });
      if (res.count !== 1) throw new OrderStatusRaceError();
    }
    await tx.shipment.upsert({
      where: { orderId: order.id },
      create: { orderId: order.id, cost: String(order.shippingCost), ...data },
      update: data,
    });
  });

  // Mail solo en el primer despacho o si cambió el código (corregir empresa/link no reenvía).
  let emailSent = false;
  if (firstDispatch || prev?.trackingNumber !== trackingNumber) {
    try {
      const content = shipmentDispatchedEmail({
        orderNumber: order.orderNumber,
        contactName: order.contactName,
        carrier,
        trackingNumber,
        trackingUrl: trackingUrl || null,
      });
      await deps.sendEmail({ to: order.contactEmail, ...content });
      emailSent = true;
    } catch (e) {
      console.error(
        `No se pudo enviar el mail de despacho del pedido ${order.orderNumber}`,
        e,
      );
    }
  }
  return { id: order.id, emailSent };
}
