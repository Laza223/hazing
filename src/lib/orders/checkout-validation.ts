import { AR_PROVINCES } from "@/lib/ar-provinces";

/**
 * Validación del formulario de checkout. Pura y compartida entre cliente
 * (feedback inmediato, errores por campo para a11y) y server
 * (`createCheckoutAction`, fuente de verdad — nunca se confía en lo que mandó
 * el cliente). Solo envío a domicilio en la Fase 8 (ver
 * docs/spec/08-checkout.md §3.2).
 */
export interface CheckoutFormInput {
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  province: string;
  cp: string;
  city: string;
  street: string;
  number: string;
  floorApt?: string;
  notes?: string;
  acceptedTerms: boolean;
}

export type CheckoutFormField =
  | "contactName"
  | "contactEmail"
  | "contactPhone"
  | "province"
  | "cp"
  | "city"
  | "street"
  | "number"
  | "floorApt"
  | "notes"
  | "acceptedTerms";

export type CheckoutFormErrors = Partial<Record<CheckoutFormField, string>>;

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const CP_RE = /^\d{4}$/;

const MAX_LENGTHS = {
  contactName: 120,
  contactEmail: 254,
  contactPhone: 40,
  city: 120,
  street: 160,
  number: 20,
  floorApt: 40,
  notes: 500,
} as const;

/** Errores por campo — vacío si el formulario es válido. Fuente de verdad
 *  única: la usa tanto el server como el form del cliente para asociar cada
 *  mensaje a su input (`aria-describedby`). */
export function validateCheckoutFormFields(
  input: CheckoutFormInput,
): CheckoutFormErrors {
  const errors: CheckoutFormErrors = {};

  if (!input.contactName.trim()) errors.contactName = "Ingresá tu nombre.";
  else if (input.contactName.length > MAX_LENGTHS.contactName)
    errors.contactName = "El nombre es demasiado largo.";

  if (!EMAIL_RE.test(input.contactEmail))
    errors.contactEmail = "Email inválido.";
  else if (input.contactEmail.length > MAX_LENGTHS.contactEmail)
    errors.contactEmail = "El email es demasiado largo.";

  if (!input.contactPhone.trim()) errors.contactPhone = "Ingresá un teléfono.";
  else if (input.contactPhone.length > MAX_LENGTHS.contactPhone)
    errors.contactPhone = "El teléfono es demasiado largo.";

  if (!AR_PROVINCES.includes(input.province as (typeof AR_PROVINCES)[number]))
    errors.province = "Seleccioná una provincia válida.";

  if (!CP_RE.test(input.cp)) errors.cp = "Código postal inválido (4 dígitos).";

  if (!input.city.trim()) errors.city = "Ingresá tu localidad.";
  else if (input.city.length > MAX_LENGTHS.city)
    errors.city = "La localidad es demasiado larga.";

  if (!input.street.trim()) errors.street = "Ingresá la calle.";
  else if (input.street.length > MAX_LENGTHS.street)
    errors.street = "La calle es demasiado larga.";

  if (!input.number.trim()) errors.number = "Ingresá el número.";
  else if (input.number.length > MAX_LENGTHS.number)
    errors.number = "El número es demasiado largo.";

  if (input.floorApt && input.floorApt.length > MAX_LENGTHS.floorApt)
    errors.floorApt = "El piso/depto es demasiado largo.";

  if (input.notes && input.notes.length > MAX_LENGTHS.notes)
    errors.notes = "Las notas son demasiado largas.";

  if (!input.acceptedTerms)
    errors.acceptedTerms = "Tenés que aceptar los Términos y Condiciones.";

  return errors;
}

/** Orden visual de los campos en el form — usado para el resumen `role="alert"`
 *  (server) y para mover el foco al primer campo inválido (cliente). */
export const CHECKOUT_FORM_FIELD_ORDER: CheckoutFormField[] = [
  "contactName",
  "contactEmail",
  "contactPhone",
  "province",
  "cp",
  "city",
  "street",
  "number",
  "floorApt",
  "notes",
  "acceptedTerms",
];

/** Devuelve el primer error encontrado (resumen `role="alert"`), o `null` si
 *  el formulario es válido. Para errores por campo, ver
 *  `validateCheckoutFormFields`. */
export function validateCheckoutForm(input: CheckoutFormInput): string | null {
  const errors = validateCheckoutFormFields(input);
  for (const field of CHECKOUT_FORM_FIELD_ORDER) {
    if (errors[field]) return errors[field]!;
  }
  return null;
}
