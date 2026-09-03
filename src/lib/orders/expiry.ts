import type { OrderStatus } from "@prisma/client";

export interface ExpirableOrder {
  id: string;
  status: OrderStatus;
  createdAt: Date;
}

/**
 * IDs de pedidos a autocancelar: pending_payment con más de `hours` horas.
 * El trigger (Cloudflare Cron) se cablea en worker.ts; esta lógica + el job quedan listos.
 */
export function findExpiredOrderIds(
  orders: ExpirableOrder[],
  now: Date,
  hours = 24,
): string[] {
  const cutoff = now.getTime() - hours * 3600_000;
  return orders
    .filter(
      (o) => o.status === "pending_payment" && o.createdAt.getTime() < cutoff,
    )
    .map((o) => o.id);
}
