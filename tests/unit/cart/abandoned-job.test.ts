import { describe, expect, it, vi } from "vitest";
import {
  runAbandonedCartJob,
  type AbandonedJobDb,
} from "@/lib/cart/abandoned-job";

const NOW = new Date("2026-10-09T12:00:00Z");
const OLD = new Date("2026-10-07T12:00:00Z");

function cart(id: string, email: string) {
  return {
    id,
    updatedAt: OLD,
    abandonedEmailSentAt: null,
    contactEmail: null,
    recoveryEmailConsent: false,
    customer: { email, name: "Ana", marketingConsent: true },
    items: [
      {
        qty: 1,
        unitPriceSnapshot: 1000,
        variant: { product: { name: "Top" }, name: "S" },
      },
    ],
  };
}

function setup(carts: ReturnType<typeof cart>[]) {
  const findMany = vi.fn().mockResolvedValue(carts);
  const update = vi.fn().mockResolvedValue({});
  const db = { cart: { findMany, update } } as unknown as AbandonedJobDb;
  const sendEmail = vi.fn().mockResolvedValue({ id: "x", logged: false });
  return { db, findMany, update, sendEmail };
}

describe("runAbandonedCartJob", () => {
  it("filtra elegibilidad en la query y ordena por antigüedad", async () => {
    const s = setup([]);
    await runAbandonedCartJob({
      db: s.db,
      sendEmail: s.sendEmail,
      now: NOW,
      appUrl: "https://hazing.test",
    });
    const args = s.findMany.mock.calls[0][0];
    expect(args.where).toMatchObject({
      status: "active",
      abandonedEmailSentAt: null,
      customer: { is: { marketingConsent: true } },
      items: { some: {} },
    });
    expect(args.where.updatedAt.lte).toEqual(new Date("2026-10-08T12:00:00Z"));
    expect(args.orderBy).toEqual({ updatedAt: "asc" });
  });

  it("el mail trae el link de baja a /cuenta/datos y marca el carrito", async () => {
    const s = setup([cart("c1", "ana@mail.com")]);
    const r = await runAbandonedCartJob({
      db: s.db,
      sendEmail: s.sendEmail,
      now: NOW,
      appUrl: "https://hazing.test",
    });
    expect(r.sent).toBe(1);
    expect(s.sendEmail.mock.calls[0][0].html).toContain(
      "https://hazing.test/cuenta/datos",
    );
    expect(s.update).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: { abandonedEmailSentAt: NOW },
    });
  });

  it("un envío fallido no corta el resto ni se marca como enviado", async () => {
    const s = setup([cart("c1", "a@mail.com"), cart("c2", "b@mail.com")]);
    s.sendEmail
      .mockRejectedValueOnce(new Error("resend caído"))
      .mockResolvedValueOnce({ id: "y", logged: false });
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const r = await runAbandonedCartJob({
      db: s.db,
      sendEmail: s.sendEmail,
      now: NOW,
      appUrl: "https://hazing.test",
    });
    err.mockRestore();
    expect(r.sent).toBe(1);
    expect(s.update).toHaveBeenCalledTimes(1);
    expect(s.update.mock.calls[0][0].where.id).toBe("c2");
  });
});
