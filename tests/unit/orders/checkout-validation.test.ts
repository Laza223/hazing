import { describe, it, expect } from "vitest";
import {
  validateCheckoutForm,
  validateCheckoutFormFields,
  type CheckoutFormInput,
} from "@/lib/orders/checkout-validation";

const valid: CheckoutFormInput = {
  contactName: "Ana",
  contactEmail: "ana@example.com",
  contactPhone: "1122334455",
  province: "CABA",
  cp: "1414",
  city: "CABA",
  street: "Calle",
  number: "123",
  floorApt: "",
  notes: "",
  acceptedTerms: true,
};

describe("validateCheckoutForm", () => {
  it("acepta un formulario completo", () => {
    expect(validateCheckoutForm(valid)).toBeNull();
  });

  it("nombre vacío", () => {
    expect(validateCheckoutForm({ ...valid, contactName: "  " })).toBe(
      "Ingresá tu nombre.",
    );
  });

  it("email inválido", () => {
    expect(
      validateCheckoutForm({ ...valid, contactEmail: "no-es-email" }),
    ).toBe("Email inválido.");
  });

  it("teléfono vacío", () => {
    expect(validateCheckoutForm({ ...valid, contactPhone: "" })).toBe(
      "Ingresá un teléfono.",
    );
  });

  it("provincia inválida (fuera de AR_PROVINCES)", () => {
    expect(validateCheckoutForm({ ...valid, province: "Narnia" })).toBe(
      "Seleccioná una provincia válida.",
    );
  });

  it("CP inválido (no son 4 dígitos)", () => {
    expect(validateCheckoutForm({ ...valid, cp: "141" })).toBe(
      "Código postal inválido (4 dígitos).",
    );
  });

  it("localidad vacía", () => {
    expect(validateCheckoutForm({ ...valid, city: "" })).toBe(
      "Ingresá tu localidad.",
    );
  });

  it("falta calle", () => {
    expect(validateCheckoutForm({ ...valid, street: "" })).toBe(
      "Ingresá la calle.",
    );
  });

  it("falta número", () => {
    expect(validateCheckoutForm({ ...valid, number: "" })).toBe(
      "Ingresá el número.",
    );
  });

  it("términos no aceptados", () => {
    expect(validateCheckoutForm({ ...valid, acceptedTerms: false })).toBe(
      "Tenés que aceptar los Términos y Condiciones.",
    );
  });

  it("largos máximos por campo", () => {
    expect(
      validateCheckoutForm({ ...valid, contactName: "a".repeat(121) }),
    ).toBe("El nombre es demasiado largo.");
    expect(
      validateCheckoutForm({
        ...valid,
        contactEmail: `${"a".repeat(250)}@x.com`,
      }),
    ).toBe("El email es demasiado largo.");
    expect(
      validateCheckoutForm({ ...valid, contactPhone: "1".repeat(41) }),
    ).toBe("El teléfono es demasiado largo.");
    expect(validateCheckoutForm({ ...valid, city: "a".repeat(121) })).toBe(
      "La localidad es demasiado larga.",
    );
    expect(validateCheckoutForm({ ...valid, street: "a".repeat(161) })).toBe(
      "La calle es demasiado larga.",
    );
    expect(validateCheckoutForm({ ...valid, number: "1".repeat(21) })).toBe(
      "El número es demasiado largo.",
    );
    expect(validateCheckoutForm({ ...valid, floorApt: "a".repeat(41) })).toBe(
      "El piso/depto es demasiado largo.",
    );
    expect(validateCheckoutForm({ ...valid, notes: "a".repeat(501) })).toBe(
      "Las notas son demasiado largas.",
    );
  });
});

describe("validateCheckoutFormFields", () => {
  it("formulario válido → sin errores", () => {
    expect(validateCheckoutFormFields(valid)).toEqual({});
  });

  it("reporta todos los campos inválidos a la vez, no solo el primero", () => {
    const errors = validateCheckoutFormFields({
      ...valid,
      contactName: "",
      contactEmail: "no-es-email",
      acceptedTerms: false,
    });
    expect(errors.contactName).toBe("Ingresá tu nombre.");
    expect(errors.contactEmail).toBe("Email inválido.");
    expect(errors.acceptedTerms).toBe(
      "Tenés que aceptar los Términos y Condiciones.",
    );
    expect(errors.contactPhone).toBeUndefined();
  });
});
