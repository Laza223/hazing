import { describe, it, expect } from "vitest";
import {
  validateCouponInput,
  type CouponFormInput,
} from "@/lib/admin/coupons/validation";

const base: CouponFormInput = {
  code: "  hazing10 ",
  type: "percentage",
  value: "10",
  scope: "all",
  scopeId: "",
  minSubtotal: "",
  maxUses: "",
  perCustomerLimit: "",
  validFrom: "",
  validTo: "",
  active: true,
};

describe("validateCouponInput", () => {
  it("normaliza el código a MAYÚSCULAS y trim", () => {
    const r = validateCouponInput(base);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.code).toBe("HAZING10");
  });

  it("acepta guiones y números en el código", () => {
    const r = validateCouponInput({ ...base, code: "VERANO-2026" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.code).toBe("VERANO-2026");
  });

  it("rechaza código vacío", () => {
    const r = validateCouponInput({ ...base, code: "   " });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/código/i);
  });

  it("rechaza código con caracteres inválidos", () => {
    const r = validateCouponInput({ ...base, code: "hazing 10!" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/código/i);
  });

  it("percentage: rechaza value fuera de 1–100", () => {
    expect(
      validateCouponInput({ ...base, type: "percentage", value: "0" }).ok,
    ).toBe(false);
    expect(
      validateCouponInput({ ...base, type: "percentage", value: "101" }).ok,
    ).toBe(false);
    const ok = validateCouponInput({
      ...base,
      type: "percentage",
      value: "100",
    });
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.value.value).toBe(100);
  });

  it("fixed: exige value > 0", () => {
    expect(validateCouponInput({ ...base, type: "fixed", value: "0" }).ok).toBe(
      false,
    );
    const ok = validateCouponInput({ ...base, type: "fixed", value: "1500.5" });
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.value.value).toBe(1500.5);
  });

  it("free_shipping: fuerza value a 0 e ignora lo ingresado", () => {
    const r = validateCouponInput({
      ...base,
      type: "free_shipping",
      value: "999",
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.value).toBe(0);
  });

  it("scope distinto de all requiere scopeId", () => {
    expect(
      validateCouponInput({ ...base, scope: "category", scopeId: "" }).ok,
    ).toBe(false);
    const ok = validateCouponInput({
      ...base,
      scope: "category",
      scopeId: "cat-1",
    });
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.value.scopeId).toBe("cat-1");
  });

  it("scope all fuerza scopeId a null aunque venga algo", () => {
    const r = validateCouponInput({ ...base, scope: "all", scopeId: "cat-1" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.scopeId).toBeNull();
  });

  it("opcionales vacíos → null", () => {
    const r = validateCouponInput(base);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.minSubtotal).toBeNull();
      expect(r.value.maxUses).toBeNull();
      expect(r.value.perCustomerLimit).toBeNull();
      expect(r.value.validFrom).toBeNull();
      expect(r.value.validTo).toBeNull();
    }
  });

  it("minSubtotal negativo → error; positivo → number", () => {
    expect(validateCouponInput({ ...base, minSubtotal: "-5" }).ok).toBe(false);
    const ok = validateCouponInput({ ...base, minSubtotal: "20000" });
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.value.minSubtotal).toBe(20000);
  });

  it("maxUses / perCustomerLimit deben ser enteros ≥ 1", () => {
    expect(validateCouponInput({ ...base, maxUses: "0" }).ok).toBe(false);
    expect(validateCouponInput({ ...base, maxUses: "2.5" }).ok).toBe(false);
    expect(validateCouponInput({ ...base, perCustomerLimit: "-1" }).ok).toBe(
      false,
    );
    const ok = validateCouponInput({
      ...base,
      maxUses: "100",
      perCustomerLimit: "1",
    });
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.value.maxUses).toBe(100);
      expect(ok.value.perCustomerLimit).toBe(1);
    }
  });

  it("fechas: parsea y exige from ≤ to", () => {
    const bad = validateCouponInput({
      ...base,
      validFrom: "2026-07-01",
      validTo: "2026-06-01",
    });
    expect(bad.ok).toBe(false);
    const ok = validateCouponInput({
      ...base,
      validFrom: "2026-06-01",
      validTo: "2026-07-01",
    });
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.value.validFrom).toEqual(new Date("2026-06-01T00:00:00-03:00"));
      expect(ok.value.validTo).toEqual(
        new Date("2026-07-01T23:59:59.999-03:00"),
      );
    }
  });

  it("rechaza fecha con formato inválido", () => {
    expect(validateCouponInput({ ...base, validFrom: "no-es-fecha" }).ok).toBe(
      false,
    );
  });

  it("validFrom se guarda como 00:00 ART del día elegido, no medianoche UTC (evita el corrimiento de un día)", () => {
    // "2026-10-01" en un <input type="date"> NUNCA debe interpretarse en UTC: 00:00 UTC
    // son las 21:00 ART del día ANTERIOR. Acá tiene que ser 03:00 UTC (00:00 ART).
    const r = validateCouponInput({ ...base, validFrom: "2026-10-01" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.validFrom?.toISOString()).toBe("2026-10-01T03:00:00.000Z");
    }
  });

  it("validTo se guarda como 23:59:59.999 ART del día elegido (fin del día, no el siguiente)", () => {
    const r = validateCouponInput({ ...base, validTo: "2026-10-01" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.validTo?.toISOString()).toBe("2026-10-02T02:59:59.999Z");
    }
  });
});
