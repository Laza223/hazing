import { describe, it, expect } from "vitest";
import { toggleWishlist } from "@/lib/customer/wishlist";

describe("toggleWishlist", () => {
  it("agrega si no existía", async () => {
    let created: unknown;
    const res = await toggleWishlist("c1", "p1", {
      db: {
        wishlist: {
          findUnique: async () => null,
          create: async (args) => {
            created = args;
          },
          delete: async () => undefined,
        },
      },
    });
    expect(res).toEqual({ added: true });
    expect(created).toEqual({ data: { customerId: "c1", productId: "p1" } });
  });

  it("quita si ya existía", async () => {
    let deleted: unknown;
    const res = await toggleWishlist("c1", "p1", {
      db: {
        wishlist: {
          findUnique: async () => ({ customerId: "c1" }),
          create: async () => undefined,
          delete: async (args) => {
            deleted = args;
          },
        },
      },
    });
    expect(res).toEqual({ added: false });
    expect(deleted).toEqual({
      where: { customerId_productId: { customerId: "c1", productId: "p1" } },
    });
  });
});

describe("toggleWishlist — concurrencia", () => {
  it("un P2002 al agregar (doble toque) cuenta como agregado", async () => {
    const res = await toggleWishlist("c1", "p1", {
      db: {
        wishlist: {
          findUnique: async () => null,
          create: async () => {
            throw Object.assign(new Error("unique"), { code: "P2002" });
          },
          delete: async () => undefined,
        },
      },
    });
    expect(res).toEqual({ added: true });
  });

  it("otros errores de DB se propagan", async () => {
    await expect(
      toggleWishlist("c1", "p1", {
        db: {
          wishlist: {
            findUnique: async () => null,
            create: async () => {
              throw new Error("db caída");
            },
            delete: async () => undefined,
          },
        },
      }),
    ).rejects.toThrow("db caída");
  });
});
