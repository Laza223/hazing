import { describe, it, expect } from "vitest";
import { buildSrcSet, buildSizes, CAMPAIGN_WIDTHS } from "@/lib/media/srcset";

describe("buildSrcSet", () => {
  it("arma una entrada por ancho con los 4 anchos default (§10)", () => {
    expect(buildSrcSet("/media/hero/campana", "avif")).toBe(
      "/media/hero/campana-640.avif 640w, /media/hero/campana-1080.avif 1080w, " +
        "/media/hero/campana-1600.avif 1600w, /media/hero/campana-2400.avif 2400w",
    );
  });

  it("respeta el formato pedido", () => {
    expect(buildSrcSet("/media/hero/campana", "webp")).toContain(
      "/media/hero/campana-640.webp 640w",
    );
  });

  it("acepta una lista de anchos custom, en el orden dado", () => {
    expect(buildSrcSet("/media/x", "avif", [1080, 640])).toBe(
      "/media/x-1080.avif 1080w, /media/x-640.avif 640w",
    );
  });

  it("CAMPAIGN_WIDTHS es la lista fija del §10", () => {
    expect(CAMPAIGN_WIDTHS).toEqual([640, 1080, 1600, 2400]);
  });

  it("rechaza basePath vacío", () => {
    expect(() => buildSrcSet("", "avif")).toThrow(/basePath vacío/);
    expect(() => buildSrcSet("   ", "avif")).toThrow(/basePath vacío/);
  });

  it("rechaza widths vacío", () => {
    expect(() => buildSrcSet("/media/x", "avif", [])).toThrow(/widths vacío/);
  });
});

describe("buildSizes", () => {
  it("arma condiciones min-width en orden más el fallback final", () => {
    expect(
      buildSizes(
        [
          { minWidth: 1280, slot: "33vw" },
          { minWidth: 768, slot: "50vw" },
        ],
        "100vw",
      ),
    ).toBe("(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw");
  });

  it("sin breakpoints devuelve solo el fallback", () => {
    expect(buildSizes([], "100vw")).toBe("100vw");
  });
});
