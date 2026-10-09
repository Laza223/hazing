import type { OrderStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/catalog/pricing";
import {
  startOfMonthART,
  startOfPrevMonthART,
} from "@/lib/admin/dashboard/dates";
import {
  PAID_PLUS_STATUSES,
  computeSalesBuckets,
  averageTicket,
  topProducts,
  sumSalesBetween,
  percentChange,
  ordersByStatus,
  countPaidOrders,
  type DashboardOrderRow,
  type DashboardOrderItemRow,
  type SalesBuckets,
  type TopProduct,
} from "@/lib/admin/dashboard/stats";

export interface DashboardData {
  sales: SalesBuckets;
  averageTicketMonth: number;
  paidOrdersMonth: number;
  /** Ventas del mes anterior hasta el mismo punto del mes (comparación justa). */
  prevMonthSamePeriod: number;
  /** Variación % del mes vs el mismo período del mes anterior; null sin base. */
  monthChangePct: number | null;
  statusFunnelMonth: Record<OrderStatus, number>;
  topProductsMonth: TopProduct[];
}

const TOP_PRODUCTS_LIMIT = 5;

/** Reúne los datos de la vista Métricas. `now` permite testear/forzar el instante de referencia. */
export async function getDashboardData(
  now: Date = new Date(),
): Promise<DashboardData> {
  const monthStart = startOfMonthART(now);
  const prevMonthStart = startOfPrevMonthART(now);

  // Pedidos desde el mes anterior: cubre hoy/semana/mes (la semana puede arrancar
  // en el mes anterior) y la comparación contra el mismo período del mes previo.
  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: prevMonthStart } },
    select: { total: true, status: true, createdAt: true },
  });
  const orderRows: DashboardOrderRow[] = orders.map((o) => ({
    total: toNumber(o.total),
    status: o.status,
    createdAt: o.createdAt,
  }));

  // Ítems de pedidos paid+ del mes, para top productos.
  const items = await prisma.orderItem.findMany({
    where: {
      order: {
        status: { in: PAID_PLUS_STATUSES },
        createdAt: { gte: monthStart },
      },
    },
    select: { productNameSnapshot: true, variantNameSnapshot: true, qty: true },
  });
  const itemRows: DashboardOrderItemRow[] = items.map((i) => ({
    productNameSnapshot: i.productNameSnapshot,
    variantNameSnapshot: i.variantNameSnapshot,
    qty: i.qty,
  }));

  const sales = computeSalesBuckets(orderRows, now);
  const elapsedMs = now.getTime() - monthStart.getTime();
  const prevPeriodEnd = new Date(
    Math.min(prevMonthStart.getTime() + elapsedMs, monthStart.getTime()),
  );
  const prevMonthSamePeriod = sumSalesBetween(
    orderRows,
    prevMonthStart,
    prevPeriodEnd,
  );

  return {
    sales,
    averageTicketMonth: averageTicket(orderRows, monthStart),
    paidOrdersMonth: countPaidOrders(orderRows, monthStart),
    prevMonthSamePeriod,
    monthChangePct: percentChange(sales.month, prevMonthSamePeriod),
    statusFunnelMonth: ordersByStatus(orderRows, monthStart),
    topProductsMonth: topProducts(itemRows, TOP_PRODUCTS_LIMIT),
  };
}
