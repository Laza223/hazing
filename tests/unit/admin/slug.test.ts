import { describe, it, expect } from "vitest";
import { slugify } from "@/lib/admin/slug";

describe("slugify", () => {
  it("pasa a minúsculas y reemplaza espacios por guiones", () => {
    expect(slugify("Vestido Negro")).toBe("vestido-negro");
    expect(slugify("Campera de Jean")).toBe("campera-de-jean");
  });

  it("saca acentos y la ñ", () => {
    expect(slugify("Pantalón Cargo")).toBe("pantalon-cargo");
    expect(slugify("Diseño Básico")).toBe("diseno-basico");
  });

  it("colapsa espacios/guiones repetidos y recorta extremos", () => {
    expect(slugify("  Remera   Oversize  ")).toBe("remera-oversize");
    expect(slugify("Set --- Total")).toBe("set-total");
    expect(slugify("---hola---")).toBe("hola");
  });

  it("elimina símbolos que no sean letra/número/guion", () => {
    expect(slugify("Set 3x1 (¡oferta!)")).toBe("set-3x1-oferta");
    expect(slugify("Kit #1 · Negro")).toBe("kit-1-negro");
  });

  it("devuelve cadena vacía si no queda nada útil", () => {
    expect(slugify("!!!")).toBe("");
    expect(slugify("   ")).toBe("");
  });
});
