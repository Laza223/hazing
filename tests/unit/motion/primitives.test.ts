import { describe, it, expect, vi } from "vitest";

// GSAP toca el DOM al crear tweens; en el entorno de Node de Vitest solo nos
// interesa el CONTRATO de las primitivas (qué propiedades animan, con qué
// duración y easing por defecto), no que efectivamente pinten algo.
const captured: { from: unknown; to: Record<string, unknown> }[] = [];

vi.mock("gsap", () => ({
  default: {
    fromTo: (_t: unknown, from: unknown, to: Record<string, unknown>) => {
      captured.push({ from, to });
      return { play: () => {}, kill: () => {} };
    },
  },
}));

const { maskReveal, fadeUp, imageSettle, lineDraw } =
  await import("@/lib/motion/primitives");
const { DURATION, EASE } = await import("@/lib/motion/tokens");

function last() {
  return captured[captured.length - 1]!;
}

// Las CUATRO primitivas del §8 de docs/spec/05-direccion-arte.md.
describe("primitivas de motion", () => {
  it("maskReveal descubre con clip-path, sin mover ni escalar", () => {
    maskReveal({} as unknown as Element);
    const { from, to } = last();
    expect((from as Record<string, string>).clipPath).toBe("inset(0 100% 0 0)");
    expect(to.clipPath).toBe("inset(0% 0% 0% 0%)");
    expect(to.duration).toBe(DURATION.overlay);
    expect(to.ease).toBe(EASE.outExpo);
    // No toca transform: la máscara no desplaza el contenido.
    expect(to).not.toHaveProperty("y");
    expect(to).not.toHaveProperty("scale");
  });

  it("maskReveal acepta dirección", () => {
    maskReveal({} as unknown as Element, { direction: "bottom" });
    expect((last().from as Record<string, string>).clipPath).toBe(
      "inset(100% 0 0 0)",
    );
  });

  it("fadeUp: opacidad + 12px de desplazamiento", () => {
    fadeUp({} as unknown as Element);
    const { from, to } = last();
    expect((from as Record<string, number>).y).toBe(12);
    expect(to.y).toBe(0);
    expect(to.autoAlpha).toBe(1);
  });

  it("imageSettle entra en 1.06 y se asienta en 900ms (§8)", () => {
    imageSettle({} as unknown as Element);
    const { from, to } = last();
    expect((from as Record<string, number>).scale).toBe(1.06);
    expect(to.scale).toBe(1);
    expect(to.duration).toBe(0.9);
    expect(to.ease).toBe(EASE.cinema);
  });

  it("lineDraw dibuja la regla con scaleX desde la izquierda", () => {
    lineDraw({} as unknown as Element);
    const { from, to } = last();
    expect((from as Record<string, unknown>).scaleX).toBe(0);
    expect((from as Record<string, unknown>).transformOrigin).toBe(
      "left center",
    );
    expect(to.scaleX).toBe(1);
  });

  it("ninguna primitiva usa un easing con overshoot", () => {
    for (const { to } of captured) {
      expect(String(to.ease)).not.toMatch(/back|elastic|bounce/i);
    }
  });
});
