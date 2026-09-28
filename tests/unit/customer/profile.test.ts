import { describe, it, expect } from "vitest";
import { updateProfile } from "@/lib/customer/profile";

describe("updateProfile", () => {
  it("actualiza nombre y teléfono", async () => {
    let updateArgs: unknown;
    const res = await updateProfile(
      "c1",
      { name: " Ana ", phone: " 1122 " },
      {
        db: {
          customer: {
            update: async (args) => {
              updateArgs = args;
              return null;
            },
          },
        },
      },
    );
    expect(res).toEqual({ ok: true });
    expect(updateArgs).toEqual({
      where: { id: "c1" },
      data: { name: "Ana", phone: "1122" },
    });
  });

  it("teléfono vacío se guarda como null", async () => {
    let updateArgs: unknown;
    await updateProfile(
      "c1",
      { name: "Ana", phone: "  " },
      {
        db: {
          customer: {
            update: async (args) => {
              updateArgs = args;
              return null;
            },
          },
        },
      },
    );
    expect(updateArgs).toEqual({
      where: { id: "c1" },
      data: { name: "Ana", phone: null },
    });
  });

  it("rechaza nombre vacío", async () => {
    const res = await updateProfile(
      "c1",
      { name: "   ", phone: "" },
      { db: { customer: { update: async () => null } } },
    );
    expect(res).toEqual({ ok: false, error: "Ingresá tu nombre." });
  });
});
