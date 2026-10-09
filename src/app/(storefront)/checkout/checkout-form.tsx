"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { AlertCircle, Loader2 } from "lucide-react";

import { round2, formatPrice } from "@/lib/money";
import { TextInput } from "@/components/ui/text-input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { CartSummary } from "@/components/cart/cart-summary";
import { CouponForm } from "@/components/cart/coupon-form";
import { AR_PROVINCES } from "@/lib/ar-provinces";
import {
  validateCheckoutFormFields,
  CHECKOUT_FORM_FIELD_ORDER,
  type CheckoutShippingMethod,
  type CheckoutFormField,
  type CheckoutFormErrors,
} from "@/lib/orders/checkout-validation";
import {
  quoteShippingAction,
  createCheckoutAction,
  type QuoteShippingResult,
} from "@/app/(storefront)/actions";

const DELIVERY_OPTIONS: Array<{
  method: CheckoutShippingMethod;
  label: string;
  help?: string;
}> = [
  { method: "domicilio", label: "Envío a domicilio" },
  {
    method: "sucursal",
    label: "Retiro en sucursal",
    help: "Te avisamos por mail en qué sucursal retirarlo cuando lo despachemos.",
  },
  {
    method: "retiro",
    label: "Retiro en Luján — gratis",
    help: "Te mandamos la dirección por mail con la confirmación del pago. Coordinamos día y hora por WhatsApp.",
  },
];

interface ItemView {
  id: string;
  name: string;
  variantName: string | null;
  qty: number;
  unitPrice: number;
}
interface DefaultAddress {
  province: string;
  cp: string;
  city: string;
  street: string;
  number: string;
  floorApt: string;
  notes: string;
}
interface Props {
  subtotal: number;
  discount: number;
  couponCode: string | null;
  couponFreeShipping: boolean;
  items: ItemView[];
  defaultName?: string;
  defaultEmail?: string;
  defaultPhone?: string;
  defaultAddress?: DefaultAddress | null;
}

export function CheckoutForm({
  subtotal,
  discount,
  couponCode,
  couponFreeShipping,
  items,
  defaultName = "",
  defaultEmail = "",
  defaultPhone = "",
  defaultAddress = null,
}: Props) {
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [phone, setPhone] = useState(defaultPhone);
  const [province, setProvince] = useState(
    defaultAddress?.province ?? "Buenos Aires",
  );
  const [cp, setCp] = useState(defaultAddress?.cp ?? "");
  const [street, setStreet] = useState(defaultAddress?.street ?? "");
  const [number, setNumber] = useState(defaultAddress?.number ?? "");
  const [floorApt, setFloorApt] = useState(defaultAddress?.floorApt ?? "");
  const [city, setCity] = useState(defaultAddress?.city ?? "");
  const [notes, setNotes] = useState(defaultAddress?.notes ?? "");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  // Sin ShippingZone para el CP: se ofrece el link a /contacto (08-checkout.md §3.3).
  const [noZone, setNoZone] = useState(false);

  const [method, setMethod] = useState<CheckoutShippingMethod>("domicilio");
  const [options, setOptions] = useState<QuoteShippingResult["options"] | null>(
    null,
  );
  const [quoting, startQuote] = useTransition();
  const [submitting, startSubmit] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<CheckoutFormErrors>({});

  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const provinceRef = useRef<HTMLButtonElement>(null);
  const cpRef = useRef<HTMLInputElement>(null);
  const cityRef = useRef<HTMLInputElement>(null);
  const streetRef = useRef<HTMLInputElement>(null);
  const numberRef = useRef<HTMLInputElement>(null);
  const floorAptRef = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const termsRef = useRef<HTMLInputElement>(null);
  const fieldRefs: Record<
    CheckoutFormField,
    React.RefObject<HTMLElement | null>
  > = {
    contactName: nameRef,
    contactEmail: emailRef,
    contactPhone: phoneRef,
    province: provinceRef,
    cp: cpRef,
    city: cityRef,
    street: streetRef,
    number: numberRef,
    floorApt: floorAptRef,
    notes: notesRef,
    acceptedTerms: termsRef,
  };

  const isPickup = method === "retiro";
  const shipping = isPickup
    ? { cost: 0, free: true }
    : (options?.[method] ?? null);
  const shippingCost = couponFreeShipping
    ? 0
    : shipping?.free
      ? 0
      : (shipping?.cost ?? null);
  const total = round2(subtotal - discount + (shippingCost ?? 0));

  // analytics: begin_checkout (PostHog, Fase 10 — ver docs/spec/08-checkout.md §3.8).

  const quote = () => {
    if (!/^\d{4}$/.test(cp)) {
      setOptions(null);
      return;
    }
    startQuote(async () => {
      const r = await quoteShippingAction({ cp, province });
      if (r.ok && r.options) {
        setOptions(r.options);
        setNoZone(Boolean(r.error));
        setError(r.error ?? null);
      } else {
        setOptions(null);
        setError(r.error ?? null);
        setNoZone(true);
      }
    });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateCheckoutFormFields({
      shippingMethod: method,
      contactName: name,
      contactEmail: email,
      contactPhone: phone,
      province,
      cp,
      city,
      street,
      number,
      floorApt,
      notes,
      acceptedTerms,
    });
    const firstInvalidField = CHECKOUT_FORM_FIELD_ORDER.find(
      (field) => errors[field],
    );
    if (firstInvalidField) {
      setFieldErrors(errors);
      setError(errors[firstInvalidField] ?? null);
      fieldRefs[firstInvalidField].current?.focus();
      return;
    }
    setFieldErrors({});
    if (shippingCost == null) {
      setError(
        "Calculá el envío con tu código postal o elegí retirar en Luján.",
      );
      return;
    }
    setError(null);
    startSubmit(async () => {
      const r = await createCheckoutAction({
        contactName: name,
        contactEmail: email,
        contactPhone: phone,
        shippingMethod: method,
        address: { cp, province, street, number, floorApt, city, notes },
        acceptedTerms,
      });
      // analytics: purchase (PostHog, Fase 10 — se dispara recién en /checkout/gracias
      // con el pago confirmado; acá solo se inicia el redirect a MP).
      if (r.ok && r.initPoint) window.location.href = r.initPoint;
      else setError(r.error ?? "No se pudo iniciar el pago.");
    });
  };

  return (
    <form onSubmit={submit} className="mt-8 grid gap-10 lg:grid-cols-12">
      <div className="space-y-8 lg:col-span-7">
        <fieldset className="space-y-3">
          <legend className="font-display text-lg text-ink">Contacto</legend>
          <TextInput
            ref={nameRef}
            id="checkout-name"
            label="Nombre y apellido"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            error={fieldErrors.contactName}
          />
          <TextInput
            ref={emailRef}
            id="checkout-email"
            label="Email"
            type="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            error={fieldErrors.contactEmail}
          />
          <TextInput
            ref={phoneRef}
            id="checkout-phone"
            label="Teléfono"
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
            error={fieldErrors.contactPhone}
          />
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="font-display text-lg text-ink">Entrega</legend>
          {DELIVERY_OPTIONS.map((o) => {
            const q = o.method === "retiro" ? { cost: 0 } : options?.[o.method];
            const price =
              o.method === "retiro"
                ? null
                : q
                  ? q.cost === 0
                    ? "Gratis"
                    : formatPrice(q.cost)
                  : options
                    ? "No disponible"
                    : "A calcular";
            return (
              <label
                key={o.method}
                className="flex cursor-pointer items-start gap-3 rounded-control border border-line p-3 has-[:checked]:border-ink"
              >
                <input
                  type="radio"
                  name="checkout-delivery"
                  value={o.method}
                  checked={method === o.method}
                  onChange={() => setMethod(o.method)}
                  aria-describedby={
                    o.help ? `checkout-delivery-${o.method}-help` : undefined
                  }
                  className="mt-0.5 size-4 shrink-0 accent-ink outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                />
                <span className="flex-1 text-sm text-ink">
                  {o.label}
                  {o.help && (
                    <span
                      id={`checkout-delivery-${o.method}-help`}
                      className="block text-xs text-ink-2"
                    >
                      {o.help}
                    </span>
                  )}
                </span>
                {price && (
                  <span className="text-sm tabular-nums text-ink">{price}</span>
                )}
              </label>
            );
          })}
        </fieldset>

        {!isPickup && (
          <fieldset className="space-y-3">
            <legend className="font-display text-lg text-ink">
              Dirección de entrega
            </legend>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="checkout-province"
                  className="tracking-caps-sm text-xs font-medium uppercase text-ink-2"
                >
                  Provincia
                </label>
                <Select
                  value={province}
                  onValueChange={(v) => {
                    setProvince(v);
                    setOptions(null);
                  }}
                >
                  <SelectTrigger
                    ref={provinceRef}
                    id="checkout-province"
                    aria-label="Provincia"
                    aria-invalid={fieldErrors.province ? "true" : undefined}
                    aria-describedby={
                      fieldErrors.province
                        ? "checkout-province-error"
                        : undefined
                    }
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AR_PROVINCES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldErrors.province && (
                  <p
                    id="checkout-province-error"
                    className="flex items-center gap-1 text-xs text-ink"
                  >
                    <AlertCircle className="size-3.5 shrink-0" aria-hidden />
                    {fieldErrors.province}
                  </p>
                )}
              </div>
              <TextInput
                ref={cpRef}
                id="checkout-cp"
                label="Código postal"
                value={cp}
                onChange={(e) => {
                  setCp(e.target.value.replace(/\D/g, "").slice(0, 4));
                  setOptions(null);
                }}
                inputMode="numeric"
                error={fieldErrors.cp}
              />
              <TextInput
                ref={cityRef}
                id="checkout-city"
                label="Localidad"
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  setOptions(null);
                }}
                autoComplete="address-level2"
                error={fieldErrors.city}
              />
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={quote}
                  disabled={quoting || cp.length !== 4}
                  className="min-h-11 w-full"
                >
                  {quoting ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    "Calcular envío"
                  )}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <TextInput
                ref={streetRef}
                id="checkout-street"
                label="Calle"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                autoComplete="address-line1"
                error={fieldErrors.street}
              />
              <TextInput
                ref={numberRef}
                id="checkout-number"
                label="Número"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                error={fieldErrors.number}
              />
              <TextInput
                ref={floorAptRef}
                id="checkout-floor"
                label="Piso / depto (opcional)"
                value={floorApt}
                onChange={(e) => setFloorApt(e.target.value)}
                error={fieldErrors.floorApt}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="checkout-notes"
                className="tracking-caps-sm text-xs font-medium uppercase text-ink-2"
              >
                Notas para la entrega (opcional)
              </label>
              <Textarea
                ref={notesRef}
                id="checkout-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                aria-invalid={fieldErrors.notes ? "true" : undefined}
                aria-describedby={
                  fieldErrors.notes ? "checkout-notes-error" : undefined
                }
              />
              {fieldErrors.notes && (
                <p
                  id="checkout-notes-error"
                  className="flex items-center gap-1 text-xs text-ink"
                >
                  <AlertCircle className="size-3.5 shrink-0" aria-hidden />
                  {fieldErrors.notes}
                </p>
              )}
            </div>
          </fieldset>
        )}
      </div>

      <aside className="space-y-6 lg:col-span-5">
        <h2 className="font-display text-lg text-ink">Resumen</h2>
        <ul className="space-y-1 text-sm">
          {items.map((it) => (
            <li key={it.id} className="flex justify-between gap-2 text-ink-2">
              <span>
                {it.name}
                {it.variantName ? ` — ${it.variantName}` : ""} × {it.qty}
              </span>
              <span className="tabular-nums text-ink">
                {formatPrice(it.unitPrice * it.qty)}
              </span>
            </li>
          ))}
        </ul>
        <CouponForm applied={couponCode} />
        <CartSummary
          subtotal={subtotal}
          discount={discount}
          total={total}
          shipping={couponFreeShipping ? { cost: 0, free: true } : shipping}
        />
        <div className="flex flex-col gap-1">
          <label className="flex items-start gap-2 text-xs text-ink-2">
            <Checkbox
              ref={termsRef}
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              aria-label="Acepto los Términos y Condiciones"
              aria-invalid={fieldErrors.acceptedTerms ? "true" : undefined}
              aria-describedby={
                fieldErrors.acceptedTerms ? "checkout-terms-error" : undefined
              }
            />
            <span>
              Acepto los{" "}
              <a
                href="/terminos"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Términos y Condiciones
              </a>
              .
            </span>
          </label>
          {fieldErrors.acceptedTerms && (
            <p
              id="checkout-terms-error"
              className="flex items-center gap-1 text-xs text-ink"
            >
              <AlertCircle className="size-3.5 shrink-0" aria-hidden />
              {fieldErrors.acceptedTerms}
            </p>
          )}
        </div>
        {error && (
          <p role="alert" className="text-sm text-ink">
            {error}
          </p>
        )}
        {noZone && (
          <Link
            href="/contacto"
            className="inline-flex min-h-11 items-center text-sm text-ink underline underline-offset-4 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            Ir a contacto
          </Link>
        )}
        <Button
          type="submit"
          size="md"
          className="w-full"
          disabled={submitting}
        >
          {submitting ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : null}
          Pagar con MercadoPago
        </Button>
      </aside>
    </form>
  );
}
