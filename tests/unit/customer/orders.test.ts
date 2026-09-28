import { describe, it, expect } from "vitest";
import { customerOrderWhere } from "@/lib/customer/orders";

describe("customerOrderWhere", () => {
  it("filtra siempre por la clienta de la sesión además del número", () => {
    expect(customerOrderWhere("HZG-000123", "c1")).toEqual({
      orderNumber: "HZG-000123",
      customerId: "c1",
    });
  });
});
