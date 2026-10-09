import { prisma, type PrismaTransactionClient } from "@/lib/prisma";
import { canTransition } from "@/lib/orders/state-machine";
import {
  applyPaidEffects,
  hadStockDeducted,
  restockItems,
} from "@/lib/orders/stock-effects";
import type { Money } from "@/lib/catalog/types";
import type { OrderStatus } from "@prisma/client";

/**
 * Servicio de pedidos del admin — port de glamify-makeup sin la rama de
 * combos (Hazing no tiene `Combo`, ver docs/spec/07-admin.md §2).
 * Cancelar o reembolsar un pedido pagado repone el stock de las variantes
 * en la misma transacción que el cambio de estado (invariante de dominio,
 * CLAUDE.md). El reembolso en sí es manual en Mercado Pago: acá solo se
 * registra el estado `refunded` (sin reembolso por API, vetado).
 */

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: "Pendiente de pago",
  paid: "Pagado",
  preparing: "Preparando",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
};

/** Item mínimo del pedido para recomputar stock. */
export interface AdminOrderItem {
  id: string;
  variantId: string | null;
  qty: number;
}

/** Superficie mínima del pedido que el servicio necesita. */
export interface AdminOrder {
  id: string;
  status: OrderStatus;
  couponId?: string | null;
  customerId?: string | null;
  shippingCost?: Money;
  items: AdminOrderItem[];
}

/** Superficie mínima de DB (para inyectar fakes en tests). */
export interface OrdersDb {
  order: {
    findUnique: (args: {
      where: { id: string };
      include?: unknown;
    }) => Promise<AdminOrder | null>;
  };
  $transaction: <T>(
    fn: (tx: PrismaTransactionClient) => Promise<T>,
  ) => Promise<T>;
}

/** El pedido cambió entre la lectura (fuera de la tx) y la escritura — otra pestaña/persona
 *  ganó la carrera. Nunca reponer stock sobre una precondición que ya no vale. */
export class OrderStatusRaceError extends Error {
  constructor() {
    super("El pedido cambió mientras lo editabas. Recargá la página.");
    this.name = "OrderStatusRaceError";
  }
}

export interface OrdersDeps {
  db: OrdersDb;
}

export function defaultOrdersDeps(): OrdersDeps {
  return { db: prisma as unknown as OrdersDb };
}

const orderInclude = { items: true } as const;

/**
 * Cambia el estado del pedido validando la transición (`state-machine.ts`).
 * Si el destino es `cancelled` o `refunded` y el estado anterior ya había
 * descontado stock, repone el stock de las variantes en la misma transacción.
 * Si el destino es `paid` (marcar pagado a mano), aplica los mismos efectos que el webhook
 * de MP: descuento de stock, Shipment y uso de cupón.
 */
export async function changeOrderStatus(
  orderId: string,
  to: OrderStatus,
  deps: OrdersDeps,
): Promise<{ id: string }> {
  const order = await deps.db.order.findUnique({
    where: { id: orderId },
    include: orderInclude,
  });
  if (!order) throw new Error("El pedido no existe.");
  if (order.status === to) return { id: order.id };
  if (!canTransition(order.status, to)) {
    throw new Error(
      `No se puede pasar de "${STATUS_LABELS[order.status]}" a "${STATUS_LABELS[to]}".`,
    );
  }

  const shouldRestock =
    (to === "cancelled" || to === "refunded") && hadStockDeducted(order.status);

  await deps.db.$transaction(async (tx) => {
    // Guarda atómica con precondición sobre el estado leído fuera de la tx (mismo patrón que
    // `webhook-service.ts`): si otra edición ya movió el pedido mientras esta corría, count
    // vuelve 0 y abortamos SIN reponer stock, en vez de pisar ciegamente y reponer dos veces.
    const res = await tx.order.updateMany({
      where: { id: order.id, status: order.status },
      data: { status: to },
    });
    if (res.count !== 1) throw new OrderStatusRaceError();
    if (shouldRestock) await restockItems(tx, order.items);
    if (to === "paid") {
      await applyPaidEffects(
        tx,
        {
          id: order.id,
          couponId: order.couponId ?? null,
          customerId: order.customerId ?? null,
          shippingCost: order.shippingCost ?? 0,
          items: order.items,
        },
        new Date(),
      );
    }
  });
  return { id: order.id };
}
