import { describe, expect, it } from "vitest";
import { DEFAULT_HOME_CONTENT, mergeHomeContent } from "@/lib/home/content";

describe("mergeHomeContent", () => {
  it("sin datos devuelve los defaults", () => {
    expect(mergeHomeContent(null)).toEqual(DEFAULT_HOME_CONTENT);
    expect(mergeHomeContent("roto")).toEqual(DEFAULT_HOME_CONTENT);
    expect(mergeHomeContent([])).toEqual(DEFAULT_HOME_CONTENT);
  });

  it("pisa solo los campos guardados", () => {
    const m = mergeHomeContent({ hero: { statement: "Otra frase" } });
    expect(m.hero.statement).toBe("Otra frase");
    expect(m.hero.eyebrow).toBe(DEFAULT_HOME_CONTENT.hero.eyebrow);
  });

  it("ignora strings vacíos y tipos incorrectos", () => {
    const m = mergeHomeContent({ hero: { statement: "", eyebrow: 5 } });
    expect(m.hero).toEqual(DEFAULT_HOME_CONTENT.hero);
  });

  it("lookbook guardado reemplaza la lista; vacío o inválido, no", () => {
    const looks = [{ image: "home/a.webp", name: "A", alt: "" }];
    expect(mergeHomeContent({ lookbook: { looks } }).lookbook.looks).toEqual([
      { image: "home/a.webp", name: "A", alt: "A" },
    ]);
    expect(mergeHomeContent({ lookbook: { looks: [] } }).lookbook).toEqual(
      DEFAULT_HOME_CONTENT.lookbook,
    );
    expect(
      mergeHomeContent({ lookbook: { looks: [{ name: "sin foto" }] } })
        .lookbook,
    ).toEqual(DEFAULT_HOME_CONTENT.lookbook);
  });

  it("editorial siempre devuelve 2 imágenes", () => {
    const m = mergeHomeContent({
      editorial: { images: [{ image: "home/x.webp", alt: "X" }] },
    });
    expect(m.editorial.images[0].image).toBe("home/x.webp");
    expect(m.editorial.images[1]).toEqual(
      DEFAULT_HOME_CONTENT.editorial.images[1],
    );
  });
});
