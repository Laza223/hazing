import { describe, it, expect } from "vitest";
import {
  cartItemToCartLine,
  type CartItemWithRefs,
} from "@/lib/cart/cart-service";

const variantItem: CartItemWithRefs = {
  id: "ci1",
  qty: 2,
  unitPriceSnapshot: "3200",
  variantId: "v1",
  variant: {
    id: "v1",
    name: "M · Negro",
    priceOverride: null,
    stock: 18,
    product: {
      id: "p1",
      name: "Remera Oversize",
      basePrice: "3200",
      categoryId: "c1",
      slug: "remera-oversize",
      images: [],
    },
  },
} as unknown as CartItemWithRefs;

describe("cartItemToCartLine", () => {
  it("mapea una línea de variante (precio efectivo, ids)", () => {
    const l = cartItemToCartLine(variantItem);
    expect(l).toMatchObject({
      id: "ci1",
      kind: "variant",
      refId: "v1",
      unitPrice: 3200,
      qty: 2,
      productId: "p1",
      categoryId: "c1",
    });
  });
  it("usa priceOverride de la variante si existe", () => {
    const item = {
      ...variantItem,
      variant: { ...variantItem.variant, priceOverride: "2990" },
    } as unknown as CartItemWithRefs;
    const l = cartItemToCartLine(item);
    expect(l.unitPrice).toBe(2990);
  });
});
