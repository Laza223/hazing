import { describe, it, expect } from "vitest";
import { runOrderExpiryJob, type ExpiryJobDb } from "@/lib/orders/expiry-job";

const now = new Date("2026-10-09T12:00:00Z");
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600_000);

interface FakeOrder {
  id: string;
  status: string;
  createdAt: Date;
  payments: Array<{ status: string }>;
}

/** Fake que honra el `where` del job (status + payments.none.status.in), como Prisma. */
function makeDb(orders: FakeOrder[]): ExpiryJobDb {
  const db = {
    order: {
      findMany: async (args: Record<string, unknown>) => {
        const where = args.where as {
          status: string;
          payments: { none: { status: { in: string[] } } };
        };
        return orders.filter(
          (o) =>
            o.status === where.status &&
            !o.payments.some((p) =>
              where.payments.none.status.in.includes(p.status),
            ),
        );
      },
      updateMany: async ({
        where,
        data,
      }: {
        where: { id: string; status: string };
        data: { status: string };
      }) => {
        const o = orders.find(
          (x) => x.id === where.id && x.status === where.status,
        );
        if (!o) return { count: 0 };
        o.status = data.status;
        return { count: 1 };
      },
    },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(db),
  };
  return db as unknown as ExpiryJobDb;
}

describe("runOrderExpiryJob", () => {
  it("cancela un pedido de 30h sin pagos", async () => {
    const orders = [
      {
        id: "a",
        status: "pending_payment",
        createdAt: hoursAgo(30),
        payments: [],
      },
    ];
    const r = await runOrderExpiryJob({ db: makeDb(orders), now });
    expect(r.cancelled).toBe(1);
    expect(orders[0].status).toBe("cancelled");
  });

  it("no cancela un pedido de 30h con un Payment in_process o approved", async () => {
    for (const status of ["in_process", "approved"]) {
      const orders = [
        {
          id: "a",
          status: "pending_payment",
          createdAt: hoursAgo(30),
          payments: [{ status: "pending" }, { status }],
        },
      ];
      const r = await runOrderExpiryJob({ db: makeDb(orders), now });
      expect(r.cancelled).toBe(0);
      expect(orders[0].status).toBe("pending_payment");
    }
  });

  it("cancela un pedido de 30h cuyo único Payment está rejected", async () => {
    const orders = [
      {
        id: "a",
        status: "pending_payment",
        createdAt: hoursAgo(30),
        payments: [{ status: "rejected" }],
      },
    ];
    const r = await runOrderExpiryJob({ db: makeDb(orders), now });
    expect(r.cancelled).toBe(1);
  });

  it("no cancela un pedido reciente", async () => {
    const orders = [
      {
        id: "a",
        status: "pending_payment",
        createdAt: hoursAgo(2),
        payments: [],
      },
    ];
    const r = await runOrderExpiryJob({ db: makeDb(orders), now });
    expect(r.cancelled).toBe(0);
    expect(orders[0].status).toBe("pending_payment");
  });
});
