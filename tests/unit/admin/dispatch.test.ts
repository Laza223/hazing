import { describe, it, expect, vi } from "vitest";
import {
  markOrderDispatched,
  resendDispatchEmail,
  parseDispatchInput,
  type DispatchDeps,
  type DispatchOrder,
} from "@/lib/admin/orders/dispatch";
import { shipmentDispatchedEmail } from "@/lib/email/templates";

const input = {
  carrier: "Via Cargo",
  trackingNumber: "VC123",
  trackingUrl: "https://viacargo.example/track/VC123",
};

function setup(over: Partial<DispatchOrder> = {}, count = 1) {
  const order: DispatchOrder = {
    id: "o1",
    orderNumber: "HZG-000001",
    status: "paid",
    shippingMethod: "domicilio",
    shippingCost: "7000.50",
    contactName: "Ana",
    contactEmail: "ana@example.com",
    shipment: null,
    ...over,
  };
  const tx = {
    order: { updateMany: vi.fn(async () => ({ count })) },
    shipment: {
      upsert: vi.fn(
        async (_a: {
          update: { trackingUrl: string | null; status: string };
        }) => ({}),
      ),
    },
  };
  const sendEmail = vi.fn(async (_m: { to: string; html: string }) => ({
    id: "m1" as string | null,
    logged: false,
  }));
  const deps = {
    db: {
      order: { findUnique: vi.fn(async () => order) },
      $transaction: vi.fn(async (fn: (t: unknown) => unknown) => fn(tx)),
    },
    sendEmail,
  } as unknown as DispatchDeps;
  return { deps, tx, sendEmail };
}

describe("parseDispatchInput", () => {
  it("exige empresa y código", () => {
    expect(parseDispatchInput({ ...input, carrier: " " }).ok).toBe(false);
    expect(parseDispatchInput({ ...input, trackingNumber: "" }).ok).toBe(false);
  });
  it("el link es opcional pero debe ser https", () => {
    expect(parseDispatchInput({ ...input, trackingUrl: "" }).ok).toBe(true);
    expect(parseDispatchInput({ ...input, trackingUrl: null }).ok).toBe(true);
    expect(
      parseDispatchInput({ ...input, trackingUrl: "http://x.com" }).ok,
    ).toBe(false);
    expect(
      parseDispatchInput({ ...input, trackingUrl: "javascript:alert(1)" }).ok,
    ).toBe(false);
    expect(parseDispatchInput({ ...input, trackingUrl: "no es url" }).ok).toBe(
      false,
    );
  });
});

describe("markOrderDispatched", () => {
  it("desde paid: pasa a shipped, crea el Shipment dispatched y manda el mail", async () => {
    const { deps, tx, sendEmail } = setup();
    const r = await markOrderDispatched("o1", input, deps);
    expect(r).toEqual({ id: "o1", emailSent: true });
    expect(tx.order.updateMany).toHaveBeenCalledWith({
      where: { id: "o1", status: "paid" },
      data: { status: "shipped" },
    });
    expect(tx.shipment.upsert).toHaveBeenCalledWith({
      where: { orderId: "o1" },
      create: {
        orderId: "o1",
        cost: "7000.50",
        carrier: "Via Cargo",
        trackingNumber: "VC123",
        trackingUrl: "https://viacargo.example/track/VC123",
        status: "dispatched",
      },
      update: {
        carrier: "Via Cargo",
        trackingNumber: "VC123",
        trackingUrl: "https://viacargo.example/track/VC123",
        status: "dispatched",
      },
    });
    expect(sendEmail).toHaveBeenCalledTimes(1);
    const mail = sendEmail.mock.calls[0][0];
    expect(mail.to).toBe("ana@example.com");
    expect(mail.html).toContain("Via Cargo");
    expect(mail.html).toContain("VC123");
    expect(mail.html).toContain("https://viacargo.example/track/VC123");
  });

  it("desde preparing también funciona; link vacío se guarda como null", async () => {
    const { deps, tx } = setup({ status: "preparing" });
    await markOrderDispatched("o1", { ...input, trackingUrl: "" }, deps);
    expect(tx.order.updateMany).toHaveBeenCalledWith({
      where: { id: "o1", status: "preparing" },
      data: { status: "shipped" },
    });
    expect(tx.shipment.upsert.mock.calls[0][0].update.trackingUrl).toBeNull();
  });

  it.each(["pending_payment", "delivered", "cancelled", "refunded"] as const)(
    "rechaza desde %s sin tocar nada",
    async (status) => {
      const { deps, tx, sendEmail } = setup({ status });
      await expect(markOrderDispatched("o1", input, deps)).rejects.toThrow(
        /pagado o en preparación/,
      );
      expect(tx.shipment.upsert).not.toHaveBeenCalled();
      expect(sendEmail).not.toHaveBeenCalled();
    },
  );

  it("rechaza retiro en Luján", async () => {
    const { deps } = setup({ shippingMethod: "retiro" });
    await expect(markOrderDispatched("o1", input, deps)).rejects.toThrow(
      /retiros/,
    );
  });

  it("si Resend falla, no falla la acción (console.error)", async () => {
    const { deps, sendEmail } = setup();
    sendEmail.mockRejectedValueOnce(new Error("resend down"));
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const r = await markOrderDispatched("o1", input, deps);
    expect(r.emailSent).toBe(false);
    expect(err).toHaveBeenCalled();
    err.mockRestore();
  });

  it("carrera de estado → error y no se crea el Shipment", async () => {
    const { deps, tx } = setup({}, 0);
    await expect(markOrderDispatched("o1", input, deps)).rejects.toThrow(
      /cambió/,
    );
    expect(tx.shipment.upsert).not.toHaveBeenCalled();
  });

  describe("idempotencia (ya enviado)", () => {
    const shipped = {
      status: "shipped" as const,
      shipment: { status: "dispatched" as const, trackingNumber: "VC123" },
    };
    it("corregir empresa/link con el mismo código no cambia estado ni reenvía mail", async () => {
      const { deps, tx, sendEmail } = setup(shipped);
      const r = await markOrderDispatched(
        "o1",
        { ...input, carrier: "Andreani" },
        deps,
      );
      expect(r.emailSent).toBe(false);
      expect(tx.order.updateMany).not.toHaveBeenCalled();
      expect(tx.shipment.upsert).toHaveBeenCalled();
      expect(sendEmail).not.toHaveBeenCalled();
    });
    it("si cambia el código, reenvía el mail", async () => {
      const { deps, sendEmail } = setup(shipped);
      await markOrderDispatched(
        "o1",
        { ...input, trackingNumber: "VC999" },
        deps,
      );
      expect(sendEmail).toHaveBeenCalledTimes(1);
    });
    it("no retrocede un envío ya in_transit", async () => {
      const { deps, tx } = setup({
        status: "shipped",
        shipment: { status: "in_transit", trackingNumber: "VC123" },
      });
      await markOrderDispatched("o1", input, deps);
      expect(tx.shipment.upsert.mock.calls[0][0].update.status).toBe(
        "in_transit",
      );
    });
  });
});

describe("shipmentDispatchedEmail", () => {
  it("escapa HTML y omite el link si no hay", () => {
    const m = shipmentDispatchedEmail({
      orderNumber: "HZG-1",
      contactName: "<b>Ana</b>",
      carrier: "Via Cargo",
      trackingNumber: "X1",
    });
    expect(m.html).not.toContain("<b>Ana</b>");
    expect(m.html).not.toContain("Seguir mi envío");
    expect(m.text).not.toContain("Seguir mi envío");
  });
});

describe("resendDispatchEmail", () => {
  const shipped = {
    status: "shipped" as const,
    shipment: {
      status: "dispatched" as const,
      carrier: "Via Cargo",
      trackingNumber: "VC123",
      trackingUrl: null,
    },
  };

  it("reenvía con los datos guardados del Shipment", async () => {
    const { deps, sendEmail } = setup(shipped);
    await expect(resendDispatchEmail("o1", deps)).resolves.toEqual({
      id: "o1",
    });
    const mail = sendEmail.mock.calls[0][0];
    expect(mail.to).toBe("ana@example.com");
    expect(mail.html).toContain("Via Cargo");
    expect(mail.html).toContain("VC123");
  });

  it("rechaza si el pedido no está enviado o no tiene despacho", async () => {
    const a = setup({ status: "paid" });
    await expect(resendDispatchEmail("o1", a.deps)).rejects.toThrow(
      /despacho cargado/,
    );
    const b = setup({ status: "shipped", shipment: null });
    await expect(resendDispatchEmail("o1", b.deps)).rejects.toThrow(
      /despacho cargado/,
    );
    expect(a.sendEmail).not.toHaveBeenCalled();
    expect(b.sendEmail).not.toHaveBeenCalled();
  });

  it("si Resend falla, propaga el error", async () => {
    const { deps, sendEmail } = setup(shipped);
    sendEmail.mockRejectedValueOnce(new Error("resend down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(resendDispatchEmail("o1", deps)).rejects.toThrow(
      /No se pudo enviar el mail/,
    );
  });
});
