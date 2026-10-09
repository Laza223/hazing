import { afterEach, describe, expect, it, vi } from "vitest";

import { isDatabaseError, publicErrorMessage } from "@/lib/prisma-errors";

afterEach(() => vi.restoreAllMocks());

describe("publicErrorMessage", () => {
  it("un error de dominio en castellano pasa tal cual", () => {
    expect(
      publicErrorMessage(new Error("No hay stock suficiente."), "fallback"),
    ).toBe("No hay stock suficiente.");
  });

  it("un error de query cruda de Prisma no le llega a la clienta", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const e = new Error(
      'Invalid `prisma.$queryRawUnsafe()` invocation: Raw query failed. Code: `42P01`. Message: `relation "order_number_seq" does not exist`',
    );
    expect(publicErrorMessage(e, "No se pudo iniciar el pago.")).toBe(
      "No se pudo iniciar el pago.",
    );
    expect(console.error).toHaveBeenCalled();
  });

  it("detecta errores de Prisma por nombre o por código Pxxxx", () => {
    const named = new Error("x");
    named.name = "PrismaClientKnownRequestError";
    const coded = Object.assign(new Error("y"), { code: "P2025" });
    expect(isDatabaseError(named)).toBe(true);
    expect(isDatabaseError(coded)).toBe(true);
    expect(isDatabaseError(new Error("Cupón inexistente."))).toBe(false);
  });

  it("algo que no es Error usa el fallback", () => {
    expect(publicErrorMessage("boom", "fallback")).toBe("fallback");
  });
});
