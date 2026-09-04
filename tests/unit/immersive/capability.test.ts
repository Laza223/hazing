import { describe, it, expect } from "vitest";

import { canRunSignatureMomentScene } from "@/components/immersive/capability";

// Tabla de combinaciones reducedMotion/deviceMemory/webgl
// (docs/spec/05-direccion-arte.md §6 "Mobile y fallbacks").
describe("canRunSignatureMomentScene", () => {
  it("reducedMotion=true bloquea sin importar el resto", () => {
    expect(
      canRunSignatureMomentScene({
        prefersReducedMotion: true,
        deviceMemory: 8,
        webglAvailable: true,
      }),
    ).toBe(false);
  });

  it("deviceMemory undefined + webgl true habilita (Safari/Firefox no bloquean)", () => {
    expect(
      canRunSignatureMomentScene({
        prefersReducedMotion: false,
        deviceMemory: undefined,
        webglAvailable: true,
      }),
    ).toBe(true);
  });

  it("deviceMemory=2 + webgl true bloquea (memoria baja)", () => {
    expect(
      canRunSignatureMomentScene({
        prefersReducedMotion: false,
        deviceMemory: 2,
        webglAvailable: true,
      }),
    ).toBe(false);
  });

  it("deviceMemory=8 + webgl false bloquea (sin WebGL)", () => {
    expect(
      canRunSignatureMomentScene({
        prefersReducedMotion: false,
        deviceMemory: 8,
        webglAvailable: false,
      }),
    ).toBe(false);
  });

  it("caso feliz: sin reduced motion, memoria suficiente, webgl disponible", () => {
    expect(
      canRunSignatureMomentScene({
        prefersReducedMotion: false,
        deviceMemory: 8,
        webglAvailable: true,
      }),
    ).toBe(true);
  });

  it("deviceMemory exactamente 4 no bloquea (el corte es < 4)", () => {
    expect(
      canRunSignatureMomentScene({
        prefersReducedMotion: false,
        deviceMemory: 4,
        webglAvailable: true,
      }),
    ).toBe(true);
  });
});
