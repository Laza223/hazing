import { describe, it, expect } from "vitest";
import { cartToCheckoutLines } from "@/lib/cart/cart-service";

const cart = {
  items: [
    {
      id: "ci1",
      qty: 2,
      unitPriceSnapshot: "3200",
      variantId: "v1",
      variant: {
        id: "v1",
        name: "M · Negro",
        sku: "REM-0001",
        priceOverride: null,
        product: {
          id: "p1",
          name: "Remera Oversize",
          basePrice: "3200",
          categoryId: "c1",
        },
      },
    },
  ],
} as any;

describe("cartToCheckoutLines", () => {
  it("genera snapshots y título para variantes", () => {
    const lines = cartToCheckoutLines(cart);
    expect(lines[0]).toMatchObject({
      productNameSnapshot: "Remera Oversize",
      variantNameSnapshot: "M · Negro",
      skuSnapshot: "REM-0001",
      title: "Remera Oversize — M · Negro",
    });
    expect(lines[0].line).toMatchObject({
      kind: "variant",
      refId: "v1",
      unitPrice: 3200,
      qty: 2,
    });
  });
});
