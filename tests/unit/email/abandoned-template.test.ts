import { describe, expect, it } from "vitest";
import { abandonedCartEmail } from "@/lib/email/templates";

describe("abandonedCartEmail", () => {
  it("trae el link de baja en html y texto", () => {
    const m = abandonedCartEmail({
      items: [{ name: "Top", qty: 1, lineTotal: 1000 }],
      recoverUrl: "https://hazing.test/carrito",
      unsubscribeUrl: "https://hazing.test/cuenta/datos",
    });
    expect(m.html).toContain("Dejar de recibir estos mails");
    expect(m.html).toContain('href="https://hazing.test/cuenta/datos"');
    expect(m.text).toContain(
      "Dejar de recibir estos mails: https://hazing.test/cuenta/datos",
    );
  });
});
