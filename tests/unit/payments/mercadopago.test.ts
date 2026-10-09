import { describe, it, expect, vi } from "vitest";
import {
  buildPreferenceBody,
  createPreference,
} from "@/lib/payments/mercadopago";
import { ORDER_EXPIRY_HOURS } from "@/lib/orders/expiry";

function fakeFetch(): typeof fetch {
  return vi.fn(
    async () =>
      new Response(
        JSON.stringify({ id: "pref-1", init_point: "https://mp/init" }),
        { status: 201 },
      ),
  ) as unknown as typeof fetch;
}

describe("createPreference — back_urls", () => {
  it("usa Order.id (UUID) en ?pedido=, nunca el orderNumber secuencial", async () => {
    const fetchFn = fakeFetch();
    await createPreference(
      {
        orderId: "5f2c1a10-1111-4a11-8a11-0123456789ab",
        orderNumber: "HZG-000123",
        items: [{ title: "Producto", quantity: 1, unit_price: 100 }],
        payerEmail: "ana@example.com",
        appUrl: "https://hazing.store",
        notificationUrl: "https://hazing.store/api/webhooks/mercadopago",
      },
      { fetch: fetchFn, accessToken: "test-token" },
    );
    const body = JSON.parse(
      (fetchFn as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string,
    ) as { back_urls: Record<string, string> };
    for (const url of Object.values(body.back_urls)) {
      expect(url).toBe(
        "https://hazing.store/checkout/gracias?pedido=5f2c1a10-1111-4a11-8a11-0123456789ab",
      );
      expect(url).not.toContain("orden=");
      expect(url).not.toContain("HZG-000123");
    }
  });
});

describe("buildPreferenceBody — vencimiento", () => {
  it("el link de pago vence a las ORDER_EXPIRY_HOURS (ISO 8601)", () => {
    const now = new Date("2026-10-09T12:00:00.000Z");
    const body = buildPreferenceBody(
      {
        orderId: "5f2c1a10-1111-4a11-8a11-0123456789ab",
        orderNumber: "HZG-000123",
        items: [{ title: "Producto", quantity: 1, unit_price: 100 }],
        payerEmail: "ana@example.com",
        appUrl: "https://hazing.store",
        notificationUrl: "https://hazing.store/api/webhooks/mercadopago",
      },
      now,
    );
    expect(ORDER_EXPIRY_HOURS).toBe(24);
    expect(body.expires).toBe(true);
    expect(body.expiration_date_to).toBe("2026-10-10T09:00:00.000-03:00");
  });
});
