import { describe, it, expect } from "vitest";
import {
  resolveCheckoutResultStatus,
  buildRetryUrl,
  isOrderId,
} from "@/lib/orders/checkout-result";

describe("resolveCheckoutResultStatus", () => {
  it("paid/preparing/shipped/delivered → paid", () => {
    for (const status of [
      "paid",
      "preparing",
      "shipped",
      "delivered",
    ] as const) {
      expect(resolveCheckoutResultStatus({ status }, null)).toBe("paid");
    }
  });

  it("cancelled/refunded → failed, sin importar el último pago", () => {
    expect(
      resolveCheckoutResultStatus(
        { status: "cancelled" },
        { status: "pending" },
      ),
    ).toBe("failed");
    expect(resolveCheckoutResultStatus({ status: "refunded" }, null)).toBe(
      "failed",
    );
  });

  it("cancelled con algún Payment approved → paid_on_cancelled (se devuelve a mano)", () => {
    expect(
      resolveCheckoutResultStatus(
        { status: "cancelled" },
        { status: "approved" },
        true,
      ),
    ).toBe("paid_on_cancelled");
    // Un pedido refunded ya fue devuelto: sigue siendo failed.
    expect(
      resolveCheckoutResultStatus(
        { status: "refunded" },
        { status: "approved" },
        true,
      ),
    ).toBe("failed");
  });

  it("pending_payment con último Payment rejected/cancelled → failed", () => {
    expect(
      resolveCheckoutResultStatus(
        { status: "pending_payment" },
        { status: "rejected" },
      ),
    ).toBe("failed");
    expect(
      resolveCheckoutResultStatus(
        { status: "pending_payment" },
        { status: "cancelled" },
      ),
    ).toBe("failed");
  });

  it("pending_payment sin pago rechazado (o sin pagos) → pending", () => {
    expect(
      resolveCheckoutResultStatus({ status: "pending_payment" }, null),
    ).toBe("pending");
    expect(
      resolveCheckoutResultStatus(
        { status: "pending_payment" },
        { status: "in_process" },
      ),
    ).toBe("pending");
  });
});

describe("isOrderId", () => {
  it("acepta un UUID", () => {
    expect(isOrderId("5f2c1a10-1111-4a11-8a11-0123456789ab")).toBe(true);
  });

  it("rechaza un orderNumber (HZG-…), aunque sea un pedido real", () => {
    expect(isOrderId("HZG-000123")).toBe(false);
  });

  it("rechaza undefined y strings vacíos", () => {
    expect(isOrderId(undefined)).toBe(false);
    expect(isOrderId("")).toBe(false);
  });
});

describe("buildRetryUrl", () => {
  it("reconstruye el checkout de MP a partir del pref_id", () => {
    expect(buildRetryUrl("abc-123")).toBe(
      "https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=abc-123",
    );
  });
});
