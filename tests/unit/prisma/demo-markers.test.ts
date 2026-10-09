import { describe, it, expect } from "vitest";
import { isDemoSkuPrefix, isDemoSlug } from "../../../prisma/demo-markers";

describe("demo-markers", () => {
  it("solo slugs demo-* son demo", () => {
    expect(isDemoSlug("demo-jeans")).toBe(true);
    expect(isDemoSlug("jeans")).toBe(false);
    expect(isDemoSlug("tops")).toBe(false);
  });
  it("prefijos de SKU demo no chocan con los reales", () => {
    expect(isDemoSkuPrefix("DJE")).toBe(true);
    for (const real of ["TOP", "BOD", "REM", "JEA", "SHO"])
      expect(isDemoSkuPrefix(real)).toBe(false);
  });
});
