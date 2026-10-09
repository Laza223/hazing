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
  it("rechaza caracteres de control (tab/LF/CR)", () => {
    expect(sanitizeNext("/\t/evil.com", "/cuenta")).toBe("/cuenta");
    expect(sanitizeNext("/\n/evil.com", "/cuenta")).toBe("/cuenta");
    expect(sanitizeNext("/\r/evil.com", "/cuenta")).toBe("/cuenta");
  });
  it("acepta path con query", () => {
    expect(sanitizeNext("/cuenta?x=1", "/")).toBe("/cuenta?x=1");
  });
  it("null/undefined → fallback", () => {
    expect(sanitizeNext(null, "/cuenta")).toBe("/cuenta");
    expect(sanitizeNext(undefined, "/cuenta")).toBe("/cuenta");
  });
});
