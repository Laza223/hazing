import { describe, it, expect } from "vitest";
import { createReview, type CreateReviewDb } from "@/lib/reviews/service";

function makeDb(overrides: Partial<CreateReviewDb> = {}): CreateReviewDb {
  return {
    orderItem: { findMany: async () => [] },
    review: {
      findUnique: async () => null,
      create: async () => ({ id: "r1" }),
    },
    ...overrides,
  };
}

describe("createReview", () => {
  it("invitada → pending, no verificada", async () => {
    const res = await createReview(
      {
        customerId: null,
        authorName: "Caro",
        productId: "p1",
        rating: 5,
        body: "Buenísimo",
      },
      { db: makeDb() },
    );
    expect(res.status).toBe("pending");
  });

  it("logueada que compró → approved", async () => {
    const db = makeDb({
      orderItem: {
        findMany: async () => [{ variant: { productId: "p1" } }],
      },
    });
    const res = await createReview(
      {
        customerId: "c1",
        authorName: "Ana",
        productId: "p1",
        rating: 4,
        body: "Me encantó",
      },
      { db },
    );
    expect(res.status).toBe("approved");
  });

  it("logueada sin compra → pending", async () => {
    const res = await createReview(
      {
        customerId: "c1",
        authorName: "Ana",
        productId: "p1",
        rating: 4,
        body: "Me encantó",
      },
      { db: makeDb() },
    );
    expect(res.status).toBe("pending");
  });

  it("logueada con reseña previa → error", async () => {
    const db = makeDb({
      review: {
        findUnique: async () => ({ id: "r0" }),
        create: async () => ({ id: "r1" }),
      },
    });
    await expect(
      createReview(
        {
          customerId: "c1",
          authorName: "Ana",
          productId: "p1",
          rating: 4,
          body: "x",
        },
        { db },
      ),
    ).rejects.toThrow("Ya dejaste tu reseña para este producto.");
  });

  it("rating inválido → error de validación", async () => {
    await expect(
      createReview(
        {
          customerId: null,
          authorName: "Caro",
          productId: "p1",
          rating: 9,
          body: "x",
        },
        { db: makeDb() },
      ),
    ).rejects.toThrow("El puntaje debe ser de 1 a 5.");
  });
});

describe("createReview — concurrencia", () => {
  it("un P2002 en el create (dos pestañas) da el mensaje de negocio", async () => {
    const db = makeDb({
      review: {
        findUnique: async () => null,
        create: async () => {
          throw Object.assign(new Error("Unique constraint failed"), {
            code: "P2002",
          });
        },
      },
    });
    await expect(
      createReview(
        {
          customerId: "c1",
          authorName: "Ana",
          productId: "p1",
          rating: 4,
          body: "Muy linda la tela",
        },
        { db },
      ),
    ).rejects.toThrow("Ya dejaste tu reseña para este producto.");
  });
});
