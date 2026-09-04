import { describe, it, expect } from "vitest";
import {
  DURATION,
  EASE,
  STAGGER,
  SCRUB,
  LENIS_LERP,
} from "@/lib/motion/tokens";

// Estos valores tienen que ser IDÉNTICOS a las custom properties de
// src/app/globals.css (--dur-*/--ease-*) — ver docs/spec/05-direccion-arte.md §8.
describe("motion tokens", () => {
  it("duraciones en segundos, alineadas a los --dur-* de globals.css", () => {
    expect(DURATION.micro).toBe(0.15);
    expect(DURATION.ui).toBe(0.25);
    expect(DURATION.overlay).toBe(0.45);
    expect(DURATION.image).toBe(0.7);
    expect(DURATION.cinema).toBe(1.2);
  });

  it("easings alineados a los --ease-* de globals.css", () => {
    expect(EASE.ui).toBe("cubic-bezier(0.4, 0, 0.2, 1)");
    expect(EASE.outExpo).toBe("cubic-bezier(0.16, 1, 0.3, 1)");
    expect(EASE.cinema).toBe("cubic-bezier(0.65, 0, 0.35, 1)");
  });

  it("nunca define un easing con overshoot/spring (prohibido por el brief)", () => {
    for (const value of Object.values(EASE)) {
      expect(value).not.toMatch(/back|elastic|bounce/i);
    }
  });

  it("stagger y scrub quedan dentro del rango documentado", () => {
    expect(STAGGER.min).toBeLessThanOrEqual(STAGGER.max);
    expect(SCRUB.min).toBeGreaterThan(0);
    expect(SCRUB.max).toBeLessThanOrEqual(1);
  });

  it("lerp de Lenis es el valor medido del brief (0.09)", () => {
    expect(LENIS_LERP).toBe(0.09);
  });
});
