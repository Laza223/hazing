import type { PrismaTransactionClient } from "@/lib/prisma";
import { computeStockDecrements } from "@/lib/orders/stock";
import { toNumber } from "@/lib/catalog/pricing";
import type { CartLine } from "@/lib/cart/types";
import type { Money } from "@/lib/catalog/types";
import type { OrderStatus } from "@prisma/client";

/** Item mínimo del pedido para mover stock. */
export interface StockItem {
  variantId: string | null;
  qty: number;
}

/** Pedido mínimo para aplicar los efectos de "pasó a pagado". */
export interface PaidEffectsOrder {
  id: string;
  couponId: string | null;
  customerId: string | null;
  shippingCost: Money;
  items: StockItem[];
}

function toLines(items: StockItem[]): CartLine[] {
  return items
    .filter((it) => it.variantId)
    .map((it, i) => ({
      id: String(i),
      kind: "variant",
      refId: it.variantId as string,
      unitPrice: 0,
      qty: it.qty,
    }));
}

/** ¿El estado ya había descontado stock? (se descuenta al confirmar el pago). */
export function hadStockDeducted(status: OrderStatus): boolean {
  return (
    status === "paid" ||
    status === "preparing" ||
    status === "shipped" ||
    status === "delivered"
  );
}

/** Repone el stock de las variantes del pedido (cancelar/reembolsar un pedido que ya descontó). */
export async function restockItems(
  tx: PrismaTransactionClient,
  items: StockItem[],
): Promise<void> {
  for (const [variantId, qty] of computeStockDecrements(toLines(items))) {
    if (qty > 0) {
      await tx.productVariant.update({
        where: { id: variantId },
        data: { stock: { increment: qty } },
      });
    }
  }
}

/**
 * Efectos "una sola vez" de pasar un pedido a pagado: descuento de stock, Shipment `pending` y
 * uso de cupón. Lo llama quien ganó la transición pending_payment → paid (webhook o admin).
 * El stock se descuenta SIEMPRE completo, aunque quede negativo: el negativo registra lo
 * adeudado y la reposición al cancelar/reembolsar queda simétrica. Devuelve las variantes
 * sobrevendidas (stock < 0 tras descontar) para alertar.
 */
export async function applyPaidEffects(
  tx: PrismaTransactionClient,
  order: PaidEffectsOrder,
  now: Date,
): Promise<{ oversoldVariantIds: string[] }> {
  const oversoldVariantIds: string[] = [];
  for (const [variantId, qty] of computeStockDecrements(toLines(order.items))) {
    const updated = await tx.productVariant.update({
      where: { id: variantId },
      data: { stock: { decrement: qty } },
      select: { stock: true },
    });
    if (updated.stock < 0) oversoldVariantIds.push(variantId);
  }

  // Shipment queda `pending` — el envío es 100% manual (ver docs/spec/00-handoff.md §2.2),
  // sin auto-import a ningún courier. La dueña carga tracking/marca despachado desde el admin.
  await tx.shipment.create({
    data: {
      orderId: order.id,
      status: "pending",
      cost: toNumber(order.shippingCost),
    },
  });

  if (order.couponId) {
    // TOCTOU: perCustomerLimit/maxUses se validan en el checkout (lectura, antes de pagar), pero
    // el incremento real pasa acá. Reafirmar de forma atómica (update condicionado al valor leído
    // en este momento) evita que dos pedidos que ganaron la carrera del checkout con el mismo
    // cupón terminen superando el límite al pagar ambos.
    const coupon = await tx.coupon.findUnique({
      where: { id: order.couponId },
      select: { maxUses: true, perCustomerLimit: true },
    });
    if (coupon?.maxUses != null) {
      await tx.coupon.updateMany({
        where: { id: order.couponId, usedCount: { lt: coupon.maxUses } },
        data: { usedCount: { increment: 1 } },
      });
    } else {
      await tx.coupon.update({
        where: { id: order.couponId },
        data: { usedCount: { increment: 1 } },
      });
    }

    if (order.customerId && coupon) {
      if (coupon.perCustomerLimit != null) {
        const res = await tx.couponRedemption.updateMany({
          where: {
            customerId: order.customerId,
            couponId: order.couponId,
            redeemedCount: { lt: coupon.perCustomerLimit },
          },
          data: {
            redeemedCount: { increment: 1 },
            lastRedeemedAt: now,
          },
        });
        if (res.count === 0) {
          // No había fila todavía (primer uso de esta clienta) → crearla si el límite lo permite.
          // Si ya existía, es que esta clienta ya está en el límite: no incrementar más.
          const exists = await tx.couponRedemption.findUnique({
            where: {
              customerId_couponId: {
                customerId: order.customerId,
                couponId: order.couponId,
              },
            },
          });
          if (!exists && coupon.perCustomerLimit > 0) {
            await tx.couponRedemption.create({
              data: {
                customerId: order.customerId,
                couponId: order.couponId,
                redeemedCount: 1,
                lastRedeemedAt: now,
              },
            });
          }
        }
      } else {
        await tx.couponRedemption.upsert({
          where: {
            customerId_couponId: {
              customerId: order.customerId,
              couponId: order.couponId,
            },
          },
          create: {
            customerId: order.customerId,
            couponId: order.couponId,
            redeemedCount: 1,
            lastRedeemedAt: now,
          },
          update: {
            redeemedCount: { increment: 1 },
            lastRedeemedAt: now,
          },
        });
      }
    }
  }

  return { oversoldVariantIds };
}
