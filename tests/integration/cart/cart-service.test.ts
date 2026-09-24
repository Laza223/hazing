import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.mock se hoistea sobre TODO lo demás (incluidas const de módulo) — las variables que la
// factory necesita van dentro de vi.hoisted() para que también se hoisteen y no exploten con
// "Cannot access before initialization".
const { cartItem, productVariant } = vi.hoisted(() => ({
  cartItem: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
  productVariant: {
    findUnique: vi.fn(),
  },
}));
vi.mock("@/lib/prisma", () => ({ prisma: { cartItem, productVariant } }));

import { addItem, updateItem, removeItem } from "@/lib/cart/cart-service";

describe("updateItem / removeItem — scopeados a cartId (evita IDOR entre carritos)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updateItem escribe con precondición cartId, no solo por itemId", async () => {
    cartItem.findFirst.mockResolvedValue({
      id: "item-1",
      cartId: "cart-a",
      qty: 1,
      variant: { stock: 10 },
    });
    cartItem.updateMany.mockResolvedValue({ count: 1 });
    await updateItem("cart-a", "item-1", 3);
    expect(cartItem.updateMany).toHaveBeenCalledWith({
      where: { id: "item-1", cartId: "cart-a" },
      data: { qty: 3 },
    });
    expect(cartItem.update).not.toHaveBeenCalled(); // nunca el update sin scope
  });

  it("updateItem tira error si el item no pertenece a ese carrito (carrito ajeno)", async () => {
    cartItem.findFirst.mockResolvedValue(null);
    await expect(
      updateItem("cart-a", "item-de-otro-carrito", 3),
    ).rejects.toThrow(/no pertenece/i);
  });

  it("removeItem borra con precondición cartId, no solo por itemId", async () => {
    cartItem.deleteMany.mockResolvedValue({ count: 1 });
    await removeItem("cart-a", "item-1");
    expect(cartItem.deleteMany).toHaveBeenCalledWith({
      where: { id: "item-1", cartId: "cart-a" },
    });
    expect(cartItem.delete).not.toHaveBeenCalled(); // nunca el delete sin scope
  });

  it("removeItem tira error si el item no pertenece a ese carrito", async () => {
    cartItem.deleteMany.mockResolvedValue({ count: 0 });
    await expect(removeItem("cart-a", "item-ajeno")).rejects.toThrow(
      /no pertenece/i,
    );
  });

  it("updateItem con qty<=0 delega a removeItem, scopeado igual", async () => {
    cartItem.deleteMany.mockResolvedValue({ count: 1 });
    await updateItem("cart-a", "item-1", 0);
    expect(cartItem.deleteMany).toHaveBeenCalledWith({
      where: { id: "item-1", cartId: "cart-a" },
    });
  });
});

describe("addItem / updateItem — una línea nunca supera el stock de su variante", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("addItem con stock 0 tira error, sin crear la línea", async () => {
    productVariant.findUnique.mockResolvedValue({
      id: "v1",
      active: true,
      stock: 0,
      priceOverride: null,
      product: { basePrice: "100" },
    });
    await expect(
      addItem({ cartId: "cart-a", variantId: "v1", qty: 1 }),
    ).rejects.toThrow(/sin stock/i);
    expect(cartItem.create).not.toHaveBeenCalled();
  });

  it("addItem clampea a stock cuando existente + pedida lo supera, y avisa (sin tirar error)", async () => {
    productVariant.findUnique.mockResolvedValue({
      id: "v1",
      active: true,
      stock: 5,
      priceOverride: null,
      product: { basePrice: "100" },
    });
    cartItem.findFirst.mockResolvedValue({ id: "item-1", qty: 3 });
    const result = await addItem({ cartId: "cart-a", variantId: "v1", qty: 4 });
    expect(cartItem.update).toHaveBeenCalledWith({
      where: { id: "item-1" },
      data: { qty: 5 },
    });
    expect(result.notice).toMatch(/solo quedan 5/i);
  });

  it("addItem caso normal (stock suficiente): sin aviso, cantidad íntegra", async () => {
    productVariant.findUnique.mockResolvedValue({
      id: "v1",
      active: true,
      stock: 10,
      priceOverride: null,
      product: { basePrice: "100" },
    });
    cartItem.findFirst.mockResolvedValue(null);
    const result = await addItem({ cartId: "cart-a", variantId: "v1", qty: 2 });
    expect(cartItem.create).toHaveBeenCalledWith({
      data: {
        cartId: "cart-a",
        variantId: "v1",
        qty: 2,
        unitPriceSnapshot: 100,
      },
    });
    expect(result.notice).toBeUndefined();
  });

  it("updateItem clampea a stock y avisa (sin tirar error)", async () => {
    cartItem.findFirst.mockResolvedValue({
      id: "item-1",
      cartId: "cart-a",
      qty: 1,
      variant: { stock: 3 },
    });
    cartItem.updateMany.mockResolvedValue({ count: 1 });
    const result = await updateItem("cart-a", "item-1", 9);
    expect(cartItem.updateMany).toHaveBeenCalledWith({
      where: { id: "item-1", cartId: "cart-a" },
      data: { qty: 3 },
    });
    expect(result.notice).toMatch(/solo quedan 3/i);
  });

  it("updateItem caso normal (dentro del stock): sin aviso, cantidad pedida", async () => {
    cartItem.findFirst.mockResolvedValue({
      id: "item-1",
      cartId: "cart-a",
      qty: 1,
      variant: { stock: 10 },
    });
    cartItem.updateMany.mockResolvedValue({ count: 1 });
    const result = await updateItem("cart-a", "item-1", 3);
    expect(cartItem.updateMany).toHaveBeenCalledWith({
      where: { id: "item-1", cartId: "cart-a" },
      data: { qty: 3 },
    });
    expect(result.notice).toBeUndefined();
  });
});
