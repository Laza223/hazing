import { describe, it, expect } from "vitest";

import {
  SIGNATURE_MOMENT_KEYFRAMES,
  INITIAL_SCENE_STATE,
} from "@/lib/motion/scene-state";

// Breakpoints IDÉNTICOS a la tabla de docs/spec/05-direccion-arte.md §6 —
// los `p` y qué propiedad cambia en cada tramo no son negociables.
describe("SIGNATURE_MOMENT_KEYFRAMES", () => {
  it("tiene exactamente los p [0, .10, .35, .65, .90, 1] en ese orden", () => {
    expect(SIGNATURE_MOMENT_KEYFRAMES.map((kf) => kf.p)).toEqual([
      0, 0.1, 0.35, 0.65, 0.9, 1,
    ]);
  });

  it("tagRotY llega a Math.PI en p=.65 y se mantiene en p=.90", () => {
    const at65 = SIGNATURE_MOMENT_KEYFRAMES.find((kf) => kf.p === 0.65);
    const at90 = SIGNATURE_MOMENT_KEYFRAMES.find((kf) => kf.p === 0.9);
    expect(at65?.state.tagRotY).toBe(Math.PI);
    expect(at90?.state.tagRotY).toBe(Math.PI);
  });

  it("camZ es no-decreciente entre p=.10 y p=.90 (dolly-out monotónico)", () => {
    const relevant = SIGNATURE_MOMENT_KEYFRAMES.filter(
      (kf) => kf.p >= 0.1 && kf.p <= 0.9 && kf.state.camZ !== undefined,
    );
    for (let i = 1; i < relevant.length; i++) {
      const prev = relevant[i - 1]!.state.camZ as number;
      const curr = relevant[i]!.state.camZ as number;
      expect(curr).toBeGreaterThanOrEqual(prev);
    }
  });

  it("fadeToPaper es 0 hasta p=.90 y 1 en p=1", () => {
    expect(INITIAL_SCENE_STATE.fadeToPaper).toBe(0);
    const at90 = SIGNATURE_MOMENT_KEYFRAMES.find((kf) => kf.p === 0.9);
    const at100 = SIGNATURE_MOMENT_KEYFRAMES.find((kf) => kf.p === 1);
    expect(at90?.state.fadeToPaper).toBeUndefined();
    expect(at100?.state.fadeToPaper).toBe(1);
  });

  it("el estado inicial (p=0) coincide con INITIAL_SCENE_STATE", () => {
    const at0 = SIGNATURE_MOMENT_KEYFRAMES.find((kf) => kf.p === 0);
    expect(at0?.state).toEqual(INITIAL_SCENE_STATE);
  });
});
