import { describe, it, expect } from "vitest";
import { sanitizeNext } from "@/lib/http/sanitize-next";

describe("sanitizeNext", () => {
  it("acepta paths internos", () => {
    expect(sanitizeNext("/producto/vestido", "/cuenta")).toBe(
      "/producto/vestido",
    );
  });
  it("rechaza URLs absolutas (open redirect)", () => {
    expect(sanitizeNext("https://evil.com", "/cuenta")).toBe("/cuenta");
  });
  it("rechaza //", () => {
    expect(sanitizeNext("//evil.com", "/cuenta")).toBe("/cuenta");
  });
  it("rechaza backslash", () => {
    expect(sanitizeNext("/\\evil.com", "/cuenta")).toBe("/cuenta");
  });
  it("null/undefined → fallback", () => {
    expect(sanitizeNext(null, "/cuenta")).toBe("/cuenta");
    expect(sanitizeNext(undefined, "/cuenta")).toBe("/cuenta");
  });
});
