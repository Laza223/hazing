import { describe, it, expect, vi } from "vitest";
import {
  createCheckout,
  PaymentProviderError,
  CouponRejectedError,
  type CreateCheckoutDeps,
  type CheckoutLineInput,
} from "@/lib/orders/checkout-service";
import type { CartLine } from "@/lib/cart/types";

const cartLine = (over: Partial<CartLine> = {}): CartLine => ({
  id: "ci1",
  kind: "variant",
  refId: "v1",
  unitPrice: 3200,
  qty: 2,
  productId: "p1",
  categoryId: "c1",
  ...over,
});
const checkoutLine = (
  over: Partial<CheckoutLineInput> = {},
): CheckoutLineInput => ({
  line: cartLine(),
  productNameSnapshot: "Remera Oversize",
  variantNameSnapshot: "M · Negro",
  skuSnapshot: "REM-0001",
  title: "Remera Oversize — M · Negro",
  ...over,
});

function makeDeps(over: Partial<CreateCheckoutDeps> = {}): {
  deps: CreateCheckoutDeps;
  created: any;
} {
  const created: any = {};
  const tx = {
    order: {
      create: vi.fn(async ({ data }: any) => {
        created.order = { id: "ord-1", ...data, payments: [{ id: "pay-1" }] };
        return created.order;
      }),
      updateMany: vi.fn(async () => ({ count: 1 })),
    },
    payment: { update: vi.fn(async () => ({})) },
    cart: { updateMany: vi.fn(async () => ({ count: 1 })) },
  };
  const deps: CreateCheckoutDeps = {
    db: {
      coupon: {
        findUnique: vi.fn(async ({ where }: any) =>
          where.code === "HAZING10"
            ? {
                id: "co-1",
                code: "HAZING10",
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
              }
            : null,
        ),
      },
      $transaction: vi.fn(async (fn: any) => fn(tx)),
    } as any,
    nextOrderSeq: vi.fn(async () => 1),
    createPreference: vi.fn(async () => ({
      id: "pref-1",
      init_point: "https://mp/ip",
      sandbox_init_point: "https://mp/sbx",
    })),
    quoteShipping: vi.fn(async () => ({
      cost: 2500,
      zoneId: "z-amba",
      freeShipping: false,
      source: "zone" as const,
    })),
    appUrl: "https://app.test",
    isSandboxToken: true,
    now: new Date("2026-06-04T12:00:00Z"),
    ...over,
  };
  (deps as any)._tx = tx;
  return { deps, created };
}

const baseInput = {
  contactName: "Ana",
  contactEmail: "ana@example.com",
  contactPhone: "1122334455",
  shippingMethod: "domicilio" as const,
  address: {
    cp: "1414",
    province: "CABA",
    street: "Calle",
    number: "123",
    city: "CABA",
  },
  lines: [checkoutLine()],
  couponCode: null as string | null,
};

describe("createCheckout", () => {
  it("crea pedido con total recalculado en server e init_point de MP", async () => {
    const { deps } = makeDeps();
    const r = await createCheckout(baseInput, deps);
    expect(r.orderNumber).toBe("HZG-000001");
    expect(r.initPoint).toBe("https://mp/sbx"); // sandbox preferido
    const tx = (deps as any)._tx;
    const orderData = tx.order.create.mock.calls[0][0].data;
    expect(orderData.subtotal).toBe(6400); // 3200×2
    expect(orderData.shippingCost).toBe(2500);
    expect(orderData.total).toBe(8900); // 6400 + 2500
    expect(orderData.status).toBe("pending_payment");
    expect(orderData.items.create).toHaveLength(1);
    expect(orderData.items.create[0]).toMatchObject({
      skuSnapshot: "REM-0001",
      qty: 2,
      lineTotal: 6400,
    });
    // sin weightGr ni comboId en el snapshot (delta vs. glamify)
    expect(orderData).not.toHaveProperty("weightGr");
    expect(orderData.items.create[0]).not.toHaveProperty("comboId");
  });

  it("con token de producción (isSandboxToken:false) devuelve el init_point real, no el sandbox", async () => {
    const { deps } = makeDeps({ isSandboxToken: false });
    const r = await createCheckout(baseInput, deps);
    expect(r.initPoint).toBe("https://mp/ip");
  });

  it("aplica el cupón y descuenta del total", async () => {
    const { deps } = makeDeps();
    const r = await createCheckout(
      { ...baseInput, couponCode: "HAZING10" },
      deps,
    );
    const orderData = (deps as any)._tx.order.create.mock.calls[0][0].data;
    expect(orderData.discountTotal).toBe(640); // 10% de 6400
    expect(orderData.total).toBe(8260); // 6400 - 640 + 2500
    expect(orderData.couponId).toBe("co-1");
    expect(r.orderId).toBe("ord-1");
  });

  it("cupón free_shipping → envío 0 en el total", async () => {
    const { deps } = makeDeps({
      db: {
        coupon: {
          findUnique: vi.fn(async () => ({
            id: "co-2",
            code: "ENVIOGRATIS",
            type: "free_shipping",
            value: 0,
            scope: "all",
            scopeId: null,
            active: true,
            minSubtotal: null,
            validFrom: null,
            validTo: null,
            maxUses: null,
            usedCount: 0,
          })),
        },
        $transaction: vi.fn(async (fn: any) =>
          fn((makeDeps().deps as any)._tx),
        ),
      } as any,
    });
    const tx = {
      order: {
        create: vi.fn(async ({ data }: any) => ({
          id: "ord-x",
          ...data,
          payments: [{ id: "p" }],
        })),
      },
      payment: { update: vi.fn() },
      cart: { updateMany: vi.fn(async () => ({ count: 1 })) },
    };
    (deps.db.$transaction as any) = vi.fn(async (fn: any) => fn(tx));
    await createCheckout({ ...baseInput, couponCode: "ENVIOGRATIS" }, deps);
    const orderData = tx.order.create.mock.calls[0][0].data;
    expect(orderData.total).toBe(6400); // envío gratis: 6400 + 0
  });

  it("cupón free_shipping con envío ya gratis (sobre el umbral): crea el pedido sin couponId y sin error", async () => {
    const { deps } = makeDeps({
      quoteShipping: vi.fn(async () => ({
        cost: 0,
        zoneId: "z-amba",
        freeShipping: true,
        source: "zone" as const,
      })),
    });
    (deps.db.coupon.findUnique as any) = vi.fn(async () => ({
      id: "co-2",
      code: "ENVIOGRATIS",
      type: "free_shipping",
      value: 0,
      scope: "all",
      scopeId: null,
      active: true,
      minSubtotal: null,
      validFrom: null,
      validTo: null,
      maxUses: null,
      usedCount: 0,
      perCustomerLimit: null,
    }));
    await createCheckout({ ...baseInput, couponCode: "ENVIOGRATIS" }, deps);
    const orderData = (deps as any)._tx.order.create.mock.calls[0][0].data;
    expect(orderData.couponId).toBeNull();
    expect(orderData.discountTotal).toBe(0);
    expect(orderData.total).toBe(6400);
  });

  it("rechaza carrito vacío", async () => {
    const { deps } = makeDeps();
    await expect(
      createCheckout({ ...baseInput, lines: [] }, deps),
    ).rejects.toThrow();
  });

  it("rechaza un cupón que ya no aplica (no cobra distinto de lo mostrado) y no crea pedido", async () => {
    const { deps } = makeDeps();
    await expect(
      createCheckout({ ...baseInput, couponCode: "NOEXISTE" }, deps),
    ).rejects.toBeInstanceOf(CouponRejectedError);
    expect((deps as any)._tx.order.create).not.toHaveBeenCalled();
  });

  it("cupón bajo el mínimo (rechazo transitorio): pedido creado sin cupón y sin error", async () => {
    const { deps } = makeDeps();
    (deps.db.coupon.findUnique as any) = vi.fn(async () => ({
      id: "co-3",
      code: "MINIMO",
      type: "percentage",
      value: 10,
      scope: "all",
      scopeId: null,
      active: true,
      minSubtotal: 999999,
      validFrom: null,
      validTo: null,
      maxUses: null,
      usedCount: 0,
      perCustomerLimit: null,
    }));
    await createCheckout({ ...baseInput, couponCode: "MINIMO" }, deps);
    const orderData = (deps as any)._tx.order.create.mock.calls[0][0].data;
    expect(orderData.couponId).toBeNull();
    expect(orderData.discountTotal).toBe(0);
    expect(orderData.total).toBe(8900);
  });

  it("cupón vencido (rechazo permanente): lanza CouponRejectedError y no crea pedido", async () => {
    const { deps } = makeDeps();
    (deps.db.coupon.findUnique as any) = vi.fn(async () => ({
      id: "co-4",
      code: "VIEJO",
      type: "percentage",
      value: 10,
      scope: "all",
      scopeId: null,
      active: true,
      minSubtotal: null,
      validFrom: null,
      validTo: new Date("2026-01-01T00:00:00Z"),
      maxUses: null,
      usedCount: 0,
      perCustomerLimit: null,
    }));
    await expect(
      createCheckout({ ...baseInput, couponCode: "VIEJO" }, deps),
    ).rejects.toBeInstanceOf(CouponRejectedError);
    expect((deps as any)._tx.order.create).not.toHaveBeenCalled();
  });

  it("los ítems de la preference MP suman exactamente el total (con envío, sin cupón)", async () => {
    const { deps } = makeDeps();
    await createCheckout(baseInput, deps);
    const items = (deps.createPreference as any).mock.calls[0][0]
      .items as Array<{ unit_price: number; quantity: number; title: string }>;
    const sum = items.reduce((a, it) => a + it.unit_price * it.quantity, 0);
    expect(sum).toBe(8900); // 6400 subtotal + 2500 envío = total
    expect(
      items.some((it) => it.title === "Envío" && it.unit_price === 2500),
    ).toBe(true);
  });

  it("con cupón de descuento, la preference se consolida en una línea = total", async () => {
    const { deps } = makeDeps();
    await createCheckout({ ...baseInput, couponCode: "HAZING10" }, deps);
    const items = (deps.createPreference as any).mock.calls[0][0]
      .items as Array<{ unit_price: number; quantity: number }>;
    const sum = items.reduce((a, it) => a + it.unit_price * it.quantity, 0);
    expect(sum).toBe(8260); // = total con descuento, lo que MP realmente cobra
    expect(items).toHaveLength(1);
  });

  it("camino feliz con cartId: marca el carrito ordered exigiendo que esté active", async () => {
    const { deps } = makeDeps();
    await createCheckout({ ...baseInput, cartId: "cart-1" }, deps);
    const tx = (deps as any)._tx;
    expect(tx.cart.updateMany).toHaveBeenCalledWith({
      where: { id: "cart-1", status: "active" },
      data: { status: "ordered" },
    });
    expect(tx.order.updateMany).not.toHaveBeenCalled();
  });

  it("si MP falla: carrito vuelve a active, pedido cancelado y error amigable (sin el texto de MP)", async () => {
    const { deps } = makeDeps({
      createPreference: vi.fn(async () => {
        throw new Error('MP createPreference falló: 500 {"message":"boom"}');
      }),
    });
    const err = await createCheckout(
      { ...baseInput, cartId: "cart-1" },
      deps,
    ).catch((e) => e);
    expect(err).toBeInstanceOf(PaymentProviderError);
    expect(err.message).not.toContain("boom");
    expect(err.message).toContain("Mercado Pago");
    const tx = (deps as any)._tx;
    expect(tx.order.updateMany).toHaveBeenCalledWith({
      where: { id: "ord-1", status: "pending_payment" },
      data: { status: "cancelled" },
    });
    expect(tx.cart.updateMany).toHaveBeenLastCalledWith({
      where: { id: "cart-1", status: "ordered" },
      data: { status: "active" },
    });
    expect(tx.payment.update).not.toHaveBeenCalled();
  });

  it("doble envío: si el carrito ya no está active falla y la tx se revierte", async () => {
    const { deps } = makeDeps();
    (deps as any)._tx.cart.updateMany = vi.fn(async () => ({ count: 0 }));
    await expect(
      createCheckout({ ...baseInput, cartId: "cart-1" }, deps),
    ).rejects.toThrow("Este carrito ya se está procesando.");
    expect(deps.createPreference).not.toHaveBeenCalled();
  });

  it("pasa método, cp, province, subtotal y unidades a quoteShipping (el costo se recalcula en server)", async () => {
    const { deps } = makeDeps();
    await createCheckout(baseInput, deps);
    expect(deps.quoteShipping).toHaveBeenCalledWith({
      method: "domicilio",
      cp: "1414",
      province: "CABA",
      subtotal: 6400,
      units: 2,
    });
  });
});
