import { describe, it, expect } from "vitest";
import {
  couponWarningCutoff,
  describeCouponDeadline,
  describeOrderExpiry,
  formatAge,
  hoursUntilExpiry,
} from "@/lib/admin/dashboard/actions";
import { startOfPrevMonthART } from "@/lib/admin/dashboard/dates";
import {
  countPaidOrders,
  ordersByStatus,
  percentChange,
  sumSalesBetween,
  type DashboardOrderRow,
} from "@/lib/admin/dashboard/stats";

const now = new Date("2026-06-10T15:00:00Z");
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600_000);
const hoursAhead = (h: number) => new Date(now.getTime() + h * 3600_000);

describe("formatAge", () => {
  it("menos de una hora", () => {
    expect(formatAge(hoursAgo(0.5), now)).toBe("hace menos de 1 h");
  });
  it("horas", () => {
    expect(formatAge(hoursAgo(5.9), now)).toBe("hace 5 h");
  });
  it("1 día y varios días", () => {
    expect(formatAge(hoursAgo(30), now)).toBe("hace 1 día");
    expect(formatAge(hoursAgo(24 * 3 + 2), now)).toBe("hace 3 días");
  });
  it("fecha futura no da negativos", () => {
    expect(formatAge(hoursAhead(2), now)).toBe("hace menos de 1 h");
  });
});

describe("vencimiento de pedidos sin pagar (24 h)", () => {
  it("calcula las horas restantes", () => {
    expect(hoursUntilExpiry(hoursAgo(19), now)).toBeCloseTo(5);
  });
  it("describe horas, menos de una hora y vencido", () => {
    expect(describeOrderExpiry(5.5)).toBe("Se cancela en 5 h");
    expect(describeOrderExpiry(0.4)).toBe("Se cancela en menos de 1 h");
    expect(describeOrderExpiry(-2)).toBe(
      "Vencido: se cancela en la próxima corrida",
    );
  });
});

describe("vencimiento de cupones", () => {
  it("vence en las próximas 24 h = hoy", () => {
    expect(describeCouponDeadline(hoursAhead(10), now)).toBe("Vence hoy");
  });
  it("vence en N días", () => {
    expect(describeCouponDeadline(hoursAhead(24 * 3 - 1), now)).toBe(
      "Vence en 3 días",
    );
  });
  it("ya venció", () => {
    expect(describeCouponDeadline(hoursAgo(2), now)).toBe("Venció hoy");
    expect(describeCouponDeadline(hoursAgo(30), now)).toBe("Venció hace 1 día");
    expect(describeCouponDeadline(hoursAgo(24 * 4 + 1), now)).toBe(
      "Venció hace 4 días",
    );
  });
  it("la ventana de aviso es de 7 días", () => {
    expect(couponWarningCutoff(now).toISOString()).toBe(
      "2026-06-17T15:00:00.000Z",
    );
  });
});

describe("startOfPrevMonthART", () => {
  it("mes anterior ART", () => {
    expect(startOfPrevMonthART(now).toISOString()).toBe(
      "2026-05-01T03:00:00.000Z",
    );
  });
  it("cruza de año en enero", () => {
    expect(
      startOfPrevMonthART(new Date("2026-01-15T12:00:00Z")).toISOString(),
    ).toBe("2025-12-01T03:00:00.000Z");
  });
});

describe("métricas", () => {
  const rows: DashboardOrderRow[] = [
    { total: 100, status: "paid", createdAt: new Date("2026-05-02T12:00:00Z") },
    {
      total: 50,
      status: "cancelled",
      createdAt: new Date("2026-05-03T12:00:00Z"),
    },
    {
      total: 200,
      status: "delivered",
      createdAt: new Date("2026-06-02T12:00:00Z"),
    },
    {
      total: 70,
      status: "pending_payment",
      createdAt: new Date("2026-06-03T12:00:00Z"),
    },
  ];

  it("sumSalesBetween solo cuenta paid+ dentro del rango [from, to)", () => {
    expect(
      sumSalesBetween(
        rows,
        new Date("2026-05-01T03:00:00Z"),
        new Date("2026-06-01T03:00:00Z"),
      ),
    ).toBe(100);
  });

  it("percentChange: variación y sin base", () => {
    expect(percentChange(200, 100)).toBe(100);
    expect(percentChange(50, 100)).toBe(-50);
    expect(percentChange(10, 0)).toBeNull();
  });

  it("ordersByStatus cuenta por estado desde `from`", () => {
    const counts = ordersByStatus(rows, new Date("2026-06-01T03:00:00Z"));
    expect(counts.delivered).toBe(1);
    expect(counts.pending_payment).toBe(1);
    expect(counts.paid).toBe(0);
    expect(counts.cancelled).toBe(0);
  });

  it("countPaidOrders ignora pendientes y cancelados", () => {
    expect(countPaidOrders(rows, new Date("2026-05-01T03:00:00Z"))).toBe(2);
  });
});
