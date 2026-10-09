import { describe, it, expect, vi } from "vitest";
import {
  createCheckout,
  CouponRejectedError,
  type CreateCheckoutDeps,
  type CheckoutDb,
} from "@/lib/orders/checkout-service";
import type { CartLine } from "@/lib/cart/types";

// Port de glamify-makeup/tests/integration/orders/checkout-per-customer.test.ts,
// adaptado a los shapes de Hazing (sin weightGr, quoteShipping por ShippingZone).
const line: CartLine = {
  id: "i1",
  kind: "variant",
  refId: "v1",
  unitPrice: 5000,
  qty: 1,
  productId: "p1",
  categoryId: "c1",
};

function makeDeps(redemptions: number): {
  deps: CreateCheckoutDeps;
  createOrder: ReturnType<typeof vi.fn>;
} {
  const createOrder = vi.fn(
    async ({ data }: { data: Record<string, unknown> }) => ({
      id: "ord1",
      orderNumber: "HZG-000001",
      ...data,
      payments: [{ id: "pay1" }],
    }),
  );
  const db = {
    coupon: {
      findUnique: vi.fn(async () => ({
        id: "cpn1",
        code: "RECOMPRA",
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
        perCustomerLimit: 1,
      })),
    },
    couponRedemption: {
      findUnique: vi.fn(async () =>
        redemptions > 0 ? { redeemedCount: redemptions } : null,
      ),
    },
    order: { count: vi.fn(async () => 0) },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        order: { create: createOrder },
        cart: { updateMany: vi.fn(async () => ({ count: 1 })) },
        payment: { update: vi.fn(async () => ({})) },
      }),
    ),
  } as unknown as CheckoutDb;

  const deps: CreateCheckoutDeps = {
    db,
    nextOrderSeq: vi.fn(async () => 1),
    createPreference: vi.fn(async () => ({
      id: "pref1",
      init_point: "http://mp",
      sandbox_init_point: "http://mp",
    })),
    quoteShipping: vi.fn(async () => ({
      cost: 2500,
      zoneId: "z1",
      freeShipping: false,
      source: "zone" as const,
    })),
    appUrl: "http://localhost:3000",
    isSandboxToken: true,
    now: new Date("2026-06-06T12:00:00Z"),
  };
  return { deps, createOrder };
}

describe("createCheckout — perCustomerLimit", () => {
  it("rechaza el pedido si la clienta superó su límite (no cobra sin descuento en silencio)", async () => {
    const { deps, createOrder } = makeDeps(1);
    const attempt = createCheckout(
      {
        contactName: "Ana",
        contactEmail: "ana@x.com",
        contactPhone: "11",
        shippingMethod: "domicilio",
        address: { cp: "1414" },
        lines: [
          {
            line,
            productNameSnapshot: "P",
            variantNameSnapshot: "V",
            skuSnapshot: "S",
            title: "P—V",
          },
        ],
        couponCode: "RECOMPRA",
        customerId: "u1",
        cartId: "cart1",
      },
      deps,
    );
    await expect(attempt).rejects.toBeInstanceOf(CouponRejectedError);
    expect(createOrder).not.toHaveBeenCalled();
  });

  it("aplica el cupón si está por debajo del límite", async () => {
    const { deps, createOrder } = makeDeps(0);
    await createCheckout(
      {
        contactName: "Ana",
        contactEmail: "ana@x.com",
        contactPhone: "11",
        shippingMethod: "domicilio",
        address: { cp: "1414" },
        lines: [
          {
            line,
            productNameSnapshot: "P",
            variantNameSnapshot: "V",
            skuSnapshot: "S",
            title: "P—V",
          },
        ],
        couponCode: "RECOMPRA",
        customerId: "u1",
        cartId: "cart1",
      },
      deps,
    );
    const call = createOrder.mock.calls[0][0] as {
      data: { couponId: string | null; discountTotal: number };
    };
    expect(call.data.couponId).toBe("cpn1");
    expect(call.data.discountTotal).toBeGreaterThan(0);
  });
});
