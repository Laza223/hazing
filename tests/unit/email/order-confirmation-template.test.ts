import { describe, expect, it } from "vitest";

import {
  newOrderAlertEmail,
  orderConfirmationEmail,
  type OrderEmailData,
} from "@/lib/email/templates";

const base: OrderEmailData = {
  orderNumber: "HZG-000001",
  contactName: "Ana",
  contactEmail: "ana@example.com",
  items: [{ name: "Top", variantName: "S · Negro", qty: 1, lineTotal: 10000 }],
  subtotal: 10000,
  shippingCost: 0,
  discountTotal: 0,
  total: 10000,
  shippingMethod: "retiro",
  pickupAddress: "Calle Falsa 123, Luján",
};

describe("orderConfirmationEmail — punto de retiro", () => {
  it("con retiro, manda la dirección en el html y en el texto", () => {
    const m = orderConfirmationEmail(base);
    expect(m.html).toContain("Punto de retiro");
    expect(m.html).toContain("Calle Falsa 123, Luján");
    expect(m.text).toContain("Punto de retiro: Calle Falsa 123, Luján");
  });

  it("escapa la dirección en el html", () => {
    const m = orderConfirmationEmail({
      ...base,
      pickupAddress: "<script>x</script>",
    });
    expect(m.html).not.toContain("<script>");
  });

  it("sin retiro no menciona ningún punto de retiro", () => {
    const m = orderConfirmationEmail({ ...base, shippingMethod: "domicilio" });
    expect(m.html).not.toContain("Punto de retiro");
    expect(m.html).not.toContain("Calle Falsa");
    expect(m.text).not.toContain("Calle Falsa");
  });

  it("con retiro y sin dirección cargada no rompe ni inventa una", () => {
    const m = orderConfirmationEmail({ ...base, pickupAddress: null });
    expect(m.html).not.toContain("Punto de retiro");
  });

  it("muestra la forma de entrega legible, no el valor del enum", () => {
    expect(orderConfirmationEmail(base).html).toContain("retiro en Luján");
  });

  it("el aviso a la dueña no lleva la dirección de retiro", () => {
    expect(newOrderAlertEmail(base).html).not.toContain("Calle Falsa");
  });
});

describe("orderConfirmationEmail — arrepentimiento", () => {
  it("incluye el plazo y el link a /arrepentimiento en html y texto", () => {
    const m = orderConfirmationEmail(base, "https://hazing.test");
    const line =
      "Tenés 10 días corridos desde que recibís tu pedido para arrepentirte de la compra:";
    expect(m.html).toContain(line);
    expect(m.html).toContain('href="https://hazing.test/arrepentimiento"');
    expect(m.text).toContain(`${line} https://hazing.test/arrepentimiento`);
  });
});
