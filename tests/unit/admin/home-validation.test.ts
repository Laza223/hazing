import { describe, expect, it } from "vitest";
import {
  isValidHref,
  isValidImagePath,
  validateHomeContent,
} from "@/lib/admin/home/validation";
import { DEFAULT_HOME_CONTENT } from "@/lib/home/content";

const base = () => structuredClone(DEFAULT_HOME_CONTENT);

describe("validateHomeContent", () => {
  it("acepta los defaults", () => {
    const r = validateHomeContent(base());
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual(DEFAULT_HOME_CONTENT);
  });

  it("recorta espacios", () => {
    const c = base();
    c.hero.statement = "  Hola  ";
    const r = validateHomeContent(c);
    expect(r.ok && r.value.hero.statement).toBe("Hola");
  });

  it("rechaza texto vacío nombrando la sección", () => {
    const c = base();
    c.story.title = "   ";
    const r = validateHomeContent(c);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("La marca");
  });

  it("rechaza links peligrosos", () => {
    for (const bad of [
      "javascript:alert(1)",
      "//evil.com",
      "http://x.com",
      "tienda",
    ]) {
      const c = base();
      c.hero.ctaHref = bad;
      expect(validateHomeContent(c).ok).toBe(false);
    }
  });

  it("rechaza imágenes fuera de /images o home/", () => {
    const c = base();
    c.campaignBand.image = "https://evil.com/x.jpg";
    expect(validateHomeContent(c).ok).toBe(false);
  });

  it("exige entre 3 y 12 looks", () => {
    const few = base();
    few.lookbook.looks = few.lookbook.looks.slice(0, 2);
    expect(validateHomeContent(few).ok).toBe(false);
    const many = base();
    many.lookbook.looks = Array.from(
      { length: 13 },
      () => many.lookbook.looks[0],
    );
    expect(validateHomeContent(many).ok).toBe(false);
  });

  it("rechaza basura", () => {
    expect(validateHomeContent(null).ok).toBe(false);
    expect(validateHomeContent({}).ok).toBe(false);
  });
});

describe("helpers", () => {
  it("isValidHref", () => {
    expect(isValidHref("/tienda?orden=novedades")).toBe(true);
    expect(isValidHref("/#lookbook")).toBe(true);
    expect(isValidHref("https://instagram.com/hazing.ok")).toBe(true);
    expect(isValidHref("//x.com")).toBe(false);
  });
  it("isValidImagePath", () => {
    expect(isValidImagePath("/images/campaign/a.webp")).toBe(true);
    expect(isValidImagePath("home/abc-123.webp")).toBe(true);
    expect(isValidImagePath("home/../secret")).toBe(false);
    expect(isValidImagePath("products/x.jpg")).toBe(false);
  });
});
