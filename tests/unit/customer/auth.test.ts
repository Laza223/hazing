import { describe, it, expect } from "vitest";
import { toCustomerUser, getCustomerWithDeps } from "@/lib/customer/auth";

describe("toCustomerUser", () => {
  it("mapea una fila a CustomerUser", () => {
    expect(toCustomerUser({ id: "u1", email: "a@b.com", name: "Ana" })).toEqual(
      {
        id: "u1",
        email: "a@b.com",
        name: "Ana",
      },
    );
  });
  it("null si no hay fila", () => {
    expect(toCustomerUser(null)).toBeNull();
  });
});

describe("getCustomerWithDeps", () => {
  it("null si no hay sesión", async () => {
    const res = await getCustomerWithDeps({
      getUser: async () => ({ data: { user: null }, error: null }),
      db: { customer: { upsert: async () => null } },
    });
    expect(res).toBeNull();
  });

  it("upsertea Customer y devuelve el resultado mapeado", async () => {
    let upsertArgs: unknown;
    const res = await getCustomerWithDeps({
      getUser: async () => ({
        data: {
          user: { id: "u1", email: "a@b.com", user_metadata: { name: "Ana" } },
        },
        error: null,
      }),
      db: {
        customer: {
          upsert: async (args) => {
            upsertArgs = args;
            return { id: "u1", email: "a@b.com", name: "Ana" };
          },
        },
      },
    });
    expect(res).toEqual({ id: "u1", email: "a@b.com", name: "Ana" });
    expect(upsertArgs).toEqual({
      where: { id: "u1" },
      create: { id: "u1", email: "a@b.com", name: "Ana" },
      update: { email: "a@b.com" },
    });
  });

  it("null si el usuario no tiene email", async () => {
    const res = await getCustomerWithDeps({
      getUser: async () => ({
        data: { user: { id: "u1", email: null } },
        error: null,
      }),
      db: { customer: { upsert: async () => null } },
    });
    expect(res).toBeNull();
  });
});
