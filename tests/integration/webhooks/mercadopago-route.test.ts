import { describe, it, expect, vi } from "vitest";

const processWebhook = vi.fn();
vi.mock("@/lib/orders/webhook-service", () => ({
  processWebhook: (...args: unknown[]) => processWebhook(...args),
  defaultWebhookDeps: () => ({ deps: "default" }),
}));

const { POST } = await import("@/app/api/webhooks/mercadopago/route");

function req(url: string, init?: RequestInit): Request {
  return new Request(url, init);
}

describe("POST /api/webhooks/mercadopago", () => {
  it("tópico ignorado (ej. merchant_order) → 200 sin llamar al servicio", async () => {
    processWebhook.mockClear();
    const res = await POST(
      req(
        "https://hazing.store/api/webhooks/mercadopago?type=merchant_order&id=1",
      ),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { detail: string };
    expect(body.detail).toBe("ignored");
    expect(processWebhook).not.toHaveBeenCalled();
  });

  it("sin data.id → 200 sin llamar al servicio", async () => {
    processWebhook.mockClear();
    const res = await POST(
      req("https://hazing.store/api/webhooks/mercadopago?type=payment"),
    );
    expect(res.status).toBe(200);
    expect(processWebhook).not.toHaveBeenCalled();
  });

  it("firma inválida → 401 (delega en processWebhook)", async () => {
    processWebhook.mockClear();
    processWebhook.mockResolvedValueOnce({
      status: 401,
      detail: "Firma inválida.",
    });
    const res = await POST(
      req(
        "https://hazing.store/api/webhooks/mercadopago?type=payment&data.id=123",
        {
          method: "POST",
          headers: { "x-signature": "bad", "x-request-id": "r1" },
        },
      ),
    );
    expect(res.status).toBe(401);
    expect(processWebhook).toHaveBeenCalledWith(
      { dataId: "123", xSignature: "bad", xRequestId: "r1" },
      { deps: "default" },
    );
  });

  it("payment válido → delega en processWebhook y refleja su status/detail", async () => {
    processWebhook.mockClear();
    processWebhook.mockResolvedValueOnce({ status: 200, detail: "paid" });
    const res = await POST(
      req(
        "https://hazing.store/api/webhooks/mercadopago?type=payment&data.id=999",
        {
          method: "POST",
        },
      ),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; detail: string };
    expect(body).toEqual({ ok: true, detail: "paid" });
    expect(processWebhook).toHaveBeenCalledWith(
      { dataId: "999", xSignature: null, xRequestId: null },
      { deps: "default" },
    );
  });
});
