import { describe, it, expect } from "vitest";
import { findIncompletePlaceholders } from "@/lib/legal/launch-readiness";

describe("findIncompletePlaceholders (Hazing)", () => {
  it("documenta los datos legales que todavía le faltan a la dueña", () => {
    // Este test no es un pass/fail de calidad: documenta el estado real de
    // docs/spec/06-storefront.md §7 (identidad legal pendiente). Si un día
    // deja de fallar acá y hay que agregar un dato nuevo, actualizar esta
    // lista junto con business-info.ts.
    expect(findIncompletePlaceholders().sort()).toEqual(
      ["legalName", "taxId", "email"].sort(),
    );
  });
});
