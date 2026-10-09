import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/catalog/pricing";
import {
  criticalStock,
  type CriticalStockEntry,
  type DashboardVariantRow,
} from "@/lib/admin/dashboard/stats";
import {
  couponWarningCutoff,
  describeCouponDeadline,
  describeOrderExpiry,
  formatAge,
  hoursUntilExpiry,
} from "@/lib/admin/dashboard/actions";

export interface OrderTask {
  id: string;
  orderNumber: string;
  contactName: string;
  total: number;
  age: string;
}

export interface UnpaidOrderTask {
  id: string;
  orderNumber: string;
  contactName: string;
  total: number;
  deadline: string;
}

export interface RefundDueTask {
  id: string;
  orderNumber: string;
  contactName: string;
  total: number;
  age: string;
}

export interface CouponTask {
  id: string;
  code: string;
  deadline: string;
}

export interface RetractionTask {
  id: string;
  seq: number;
  contactName: string;
  age: string;
}

export interface ActionData {
  toPrepare: OrderTask[];
  toDispatch: OrderTask[];
  unpaidExpiring: UnpaidOrderTask[];
  /** Pedidos cancelados/reembolsados con un pago aprobado: la plata hay que devolverla a mano en MP. */
  refundsDue: RefundDueTask[];
  couponsExpiring: CouponTask[];
  retractionsPending: RetractionTask[];
  reviewsPending: number;
  criticalStock: CriticalStockEntry[];
}

const CRITICAL_STOCK_LIMIT = 20;
const LIST_LIMIT = 10;

/** Reúne lo que requiere acción de la dueña (bandeja de Inicio). `now` permite testear. */
export async function getActionData(
  now: Date = new Date(),
): Promise<ActionData> {
  const [
    workOrders,
    unpaidOrders,
    refundOrders,
    coupons,
    retractions,
    reviewsPending,
    variants,
  ] = await Promise.all([
    prisma.order.findMany({
      where: { status: { in: ["paid", "preparing"] } },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        orderNumber: true,
        contactName: true,
        total: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.order.findMany({
      where: { status: "pending_payment" },
      orderBy: { createdAt: "asc" },
      take: LIST_LIMIT,
      select: {
        id: true,
        orderNumber: true,
        contactName: true,
        total: true,
        createdAt: true,
      },
    }),
    prisma.order.findMany({
      where: {
        status: { in: ["cancelled", "refunded"] },
        payments: { some: { status: "approved" } },
      },
      orderBy: { createdAt: "desc" },
      take: LIST_LIMIT,
      select: {
        id: true,
        orderNumber: true,
        contactName: true,
        total: true,
        createdAt: true,
      },
    }),
    prisma.coupon.findMany({
      where: {
        active: true,
        validTo: { not: null, lte: couponWarningCutoff(now) },
      },
      orderBy: { validTo: "asc" },
      take: LIST_LIMIT,
      select: { id: true, code: true, validTo: true },
    }),
    prisma.retractionRequest.findMany({
      where: { status: "pending" },
      orderBy: { createdAt: "asc" },
      take: LIST_LIMIT,
      select: { id: true, seq: true, contactName: true, createdAt: true },
    }),
    prisma.review.count({ where: { status: "pending" } }),
    prisma.productVariant.findMany({
      where: { active: true, product: { deletedAt: null, active: true } },
      select: {
        id: true,
        name: true,
        sku: true,
        stock: true,
        lowStockThreshold: true,
        product: { select: { name: true } },
      },
    }),
  ]);

  const toTask = (o: (typeof refundOrders)[number]): OrderTask => ({
    id: o.id,
    orderNumber: o.orderNumber,
    contactName: o.contactName,
    total: toNumber(o.total),
    age: formatAge(o.createdAt, now),
  });

  const variantRows: DashboardVariantRow[] = variants.map((v) => ({
    id: v.id,
    productName: v.product.name,
    variantName: v.name,
    sku: v.sku,
    stock: v.stock,
    lowStockThreshold: v.lowStockThreshold,
  }));

  return {
    toPrepare: workOrders.filter((o) => o.status === "paid").map(toTask),
    toDispatch: workOrders.filter((o) => o.status === "preparing").map(toTask),
    unpaidExpiring: unpaidOrders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      contactName: o.contactName,
      total: toNumber(o.total),
      deadline: describeOrderExpiry(hoursUntilExpiry(o.createdAt, now)),
    })),
    refundsDue: refundOrders.map(toTask),
    couponsExpiring: coupons.flatMap((c) =>
      c.validTo
        ? [
            {
              id: c.id,
              code: c.code,
              deadline: describeCouponDeadline(c.validTo, now),
            },
          ]
        : [],
    ),
    retractionsPending: retractions.map((r) => ({
      id: r.id,
      seq: r.seq,
      contactName: r.contactName,
      age: formatAge(r.createdAt, now),
    })),
    reviewsPending,
    criticalStock: criticalStock(variantRows).slice(0, CRITICAL_STOCK_LIMIT),
  };
}
