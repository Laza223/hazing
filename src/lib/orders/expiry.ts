import type { OrderStatus } from "@prisma/client";

/** Ventana de autocancelación de pedidos sin pagar; también vence el link de pago de MP. */
export const ORDER_EXPIRY_HOURS = 24;

export interface ExpirableOrder {
  id: string;
  status: OrderStatus;
  createdAt: Date;
}

/**
 * IDs de pedidos a autocancelar: pending_payment con más de `hours` horas.
 * El trigger es el cron horario de `src/app/api/cron/route.ts` (Vercel Cron, ADR 0005).
 */
export function findExpiredOrderIds(
  orders: ExpirableOrder[],
  now: Date,
  hours = ORDER_EXPIRY_HOURS,
): string[] {
  const cutoff = now.getTime() - hours * 3600_000;
  return orders
    .filter(
      (o) => o.status === "pending_payment" && o.createdAt.getTime() < cutoff,
    )
    .map((o) => o.id);
}
