import { describe, it, expect, vi } from "vitest";
import {
  evaluateCoupon,
  type CouponEvalDb,
  type CouponRow,
} from "@/lib/coupons/evaluate";
import type { CartLine } from "@/lib/cart/types";

const NOW = new Date("2026-06-04T12:00:00Z");

const coupon = (over: Partial<CouponRow> = {}): CouponRow => ({
  id: "co1",
  code: "PROMO",
  type: "percentage",
  value: 10,
  scope: "all",
  scopeId: null,
  active: true,
  minSubtotal: null,
  validFrom: null,
  validTo: null,
  maxUses: null,
  usedCount: 0,
  perCustomerLimit: null,
  ...over,
});
const line = (over: Partial<CartLine> = {}): CartLine => ({
  id: "l1",
  kind: "variant",
  refId: "v1",
  unitPrice: 1000,
  qty: 1,
  productId: "p1",
  categoryId: "c1",
  ...over,
});

function makeDb(
  row: CouponRow | null,
  counts: { orders?: number; redeemed?: number } = {},
) {
  const count = vi.fn(
    async (_args: { where: Record<string, unknown> }) => counts.orders ?? 0,
  );
  const db: CouponEvalDb = {
    coupon: { findUnique: vi.fn(async () => row) },
    couponRedemption: {
      findUnique: vi.fn(async () =>
        counts.redeemed ? { redeemedCount: counts.redeemed } : null,
      ),
    },
    order: { count },
  };
  return { db, count };
}
const run = (db: CouponEvalDb, over = {}) =>
  evaluateCoupon(db, { code: "PROMO", lines: [line()], now: NOW, ...over });

describe("evaluateCoupon", () => {
  it("cupon valido: devuelve descuento y couponId", async () => {
    const { db } = makeDb(coupon());
    expect(await run(db)).toMatchObject({
      ok: true,
      couponId: "co1",
      discount: 100,
    });
  });

  it("K2: rechaza un cupon que deja el total en $0", async () => {
    const { db } = makeDb(coupon({ value: 100 }));
    expect(await run(db)).toEqual({
      ok: false,
      reason: "Este cupón no se puede usar en esta compra.",
      permanent: false,
    });
    const fixed = makeDb(coupon({ type: "fixed", value: 5000 }));
    expect((await run(fixed.db)).ok).toBe(false);
  });

  it("K3: maxUses = usedCount + pendientes vigentes totales - pendientes propios (dos queries)", async () => {
    const { db, count } = makeDb(coupon({ maxUses: 3, usedCount: 1 }));
    // 2 pendientes vigentes en total, 1 de ellos propio -> 1 + (2 - 1) = 2 < 3
    count.mockImplementation(async ({ where }) => (where.OR ? 1 : 2));
    expect(
      (await run(db, { customerId: "u1", contactEmail: "a@x.com" })).ok,
    ).toBe(true);
    expect(count).toHaveBeenCalledTimes(2);
    const all = count.mock.calls[0][0].where as Record<string, any>;
    expect(all.couponId).toBe("co1");
    expect(all.status).toBe("pending_payment");
    expect(all.createdAt.gte).toEqual(new Date("2026-06-03T12:00:00Z"));
    expect(all.OR).toBeUndefined();
    expect(all.NOT).toBeUndefined();
    const own = count.mock.calls[1][0].where as Record<string, any>;
    expect(own).toMatchObject({ couponId: "co1", status: "pending_payment" });
    expect(own.OR).toEqual([
      { customerId: "u1" },
      { contactEmail: { equals: "a@x.com", mode: "insensitive" } },
    ]);
  });

  it("K3: el pending de otra clienta (o invitada) cuenta para maxUses", async () => {
    const { db, count } = makeDb(coupon({ maxUses: 2, usedCount: 1 }));
    count.mockImplementation(async ({ where }) => (where.OR ? 0 : 1));
    expect(await run(db, { customerId: "u1" })).toMatchObject({
      ok: false,
      reason: "El cupón alcanzó su límite de usos.",
      permanent: true,
    });
  });

  it("K3: sin identidad conocida no resta nada (una sola query)", async () => {
    const { db, count } = makeDb(coupon({ maxUses: 2, usedCount: 0 }), {
      orders: 1,
    });
    expect((await run(db)).ok).toBe(true);
    expect(count).toHaveBeenCalledTimes(1);
  });

  it("K3: una invitada que repite el email (otra casing) es rechazada por perCustomerLimit", async () => {
    const { db, count } = makeDb(coupon({ perCustomerLimit: 1 }), {
      orders: 1,
    });
    const r = await run(db, { customerId: null, contactEmail: " Ana@X.com " });
    expect(r).toMatchObject({
      ok: false,
      reason: "Ya usaste este cupón el máximo de veces.",
      permanent: true,
    });
    const where = count.mock.calls[0][0].where as Record<string, any>;
    // solo usos efectivos: nunca pending_payment
    expect(where.status).toEqual({
      in: ["paid", "preparing", "shipped", "delivered"],
    });
    expect(where.OR).toEqual([
      { contactEmail: { equals: "ana@x.com", mode: "insensitive" } },
    ]);
  });

  it("K3: invitada sin pedidos previos con ese email pasa", async () => {
    const { db } = makeDb(coupon({ perCustomerLimit: 1 }), { orders: 0 });
    expect((await run(db, { contactEmail: "nueva@x.com" })).ok).toBe(true);
  });

  it("K3: con sesion cuenta por customerId o por email", async () => {
    const { db, count } = makeDb(coupon({ perCustomerLimit: 1 }), {
      orders: 0,
    });
    await run(db, { customerId: "u1", contactEmail: "a@x.com" });
    const where = count.mock.calls[0][0].where as Record<string, any>;
    expect(where.OR).toEqual([
      { customerId: "u1" },
      { contactEmail: { equals: "a@x.com", mode: "insensitive" } },
    ]);
  });

  it("K5: cupon de categoria sin productos de esa categoria no da beneficio y se rechaza", async () => {
    const { db } = makeDb(coupon({ scope: "category", scopeId: "otra" }));
    expect(await run(db)).toEqual({
      ok: false,
      reason: "El cupón no aplica a los productos de tu carrito.",
      permanent: false,
    });
  });

  it("envio gratis con envio ya en $0: aplicable sin beneficio (no rechazo)", async () => {
    const { db } = makeDb(coupon({ type: "free_shipping", value: 0 }));
    expect(await run(db, { shippingCost: 0 })).toMatchObject({
      ok: true,
      noBenefit: true,
    });
    expect(await run(db, { shippingCost: 2500 })).toMatchObject({
      ok: true,
      noBenefit: false,
    });
  });

  it("clasifica rechazos: minimo = transitorio; vencido/inactivo = permanente", async () => {
    const min = makeDb(coupon({ minSubtotal: 5000 }));
    expect(await run(min.db)).toMatchObject({ ok: false, permanent: false });
    const off = makeDb(coupon({ active: false }));
    expect(await run(off.db)).toMatchObject({ ok: false, permanent: true });
    const old = makeDb(coupon({ validTo: new Date("2026-01-01") }));
    expect(await run(old.db)).toMatchObject({ ok: false, permanent: true });
  });

  it("cupon inexistente", async () => {
    const { db } = makeDb(null);
    expect(await run(db)).toEqual({
      ok: false,
      reason: "Cupón inexistente.",
      permanent: true,
    });
  });
});
