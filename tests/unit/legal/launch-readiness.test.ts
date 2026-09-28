import { describe, it, expect } from "vitest";
import { findIncompletePlaceholders } from "@/lib/legal/launch-readiness";

describe("findIncompletePlaceholders (Hazing)", () => {
  it("no quedan datos legales sin completar (se publican en /terminos y /privacidad)", () => {
    expect(findIncompletePlaceholders()).toEqual([]);
  });

  it("detecta un placeholder si vuelve a aparecer", () => {
    expect(
      findIncompletePlaceholders({
        email: "[COMPLETAR: email]",
        legalName: "Ana",
      }),
    ).toEqual(["email"]);
  });
});
