import type { PaymentStatus } from "@prisma/client";
import { ORDER_EXPIRY_HOURS } from "@/lib/orders/expiry";

const MP_API = "https://api.mercadopago.com";
// Sin esto, un MP colgado (no error HTTP, directamente no responde) cuelga el checkout
// o el webhook indefinidamente.
const TIMEOUT_MS = 8000;

export interface MpDeps {
  fetch?: typeof fetch;
  accessToken?: string;
}
function resolveDeps(deps: MpDeps): { fetchFn: typeof fetch; token: string } {
  const fetchFn = deps.fetch ?? fetch;
  const token = deps.accessToken ?? process.env.MP_ACCESS_TOKEN ?? "";
  if (!token) throw new Error("MP_ACCESS_TOKEN no configurado.");
  return { fetchFn, token };
}

export interface PreferenceItem {
  title: string;
  quantity: number;
  unit_price: number;
}
export interface CreatePreferenceInput {
  orderId: string;
  orderNumber: string;
  items: PreferenceItem[];
  payerEmail: string;
  appUrl: string;
  notificationUrl: string;
}
export interface MpPreference {
  id: string;
  init_point: string;
  sandbox_init_point?: string;
}

/** Arma el body de la preference de Checkout Pro (pura, testeable). */
/** ISO con offset explícito de Argentina (-03:00, sin horario de verano), el
 *  formato de los ejemplos de MP para `expiration_date_to`. */
function toArtIso(d: Date): string {
  const art = new Date(d.getTime() - 3 * 3600_000);
  return art.toISOString().replace("Z", "-03:00");
}

export function buildPreferenceBody(input: CreatePreferenceInput, now: Date) {
  return {
    items: input.items.map((it, i) => ({
      id: String(i),
      currency_id: "ARS",
      ...it,
    })),
    payer: { email: input.payerEmail },
    external_reference: input.orderId,
    notification_url: input.notificationUrl,
    // `pedido` = Order.id (UUID, no adivinable) — el orderNumber es secuencial
    // (HZG-000123) y permite enumerar pedidos ajenos en /checkout/gracias.
    back_urls: {
      success: `${input.appUrl}/checkout/gracias?pedido=${input.orderId}`,
      failure: `${input.appUrl}/checkout/gracias?pedido=${input.orderId}`,
      pending: `${input.appUrl}/checkout/gracias?pedido=${input.orderId}`,
    },
    auto_return: "approved",
    payment_methods: {
      excluded_payment_types: [{ id: "ticket" }, { id: "atm" }],
      installments: 12,
    },
    // El link de pago vence junto con el pedido: runOrderExpiryJob lo cancela a las
    // ORDER_EXPIRY_HOURS y un pago aprobado después quedaría cobrado sobre un pedido muerto.
    expires: true,
    expiration_date_to: toArtIso(
      new Date(now.getTime() + ORDER_EXPIRY_HOURS * 3600_000),
    ),
    statement_descriptor: "HAZING",
    metadata: { order_number: input.orderNumber },
  };
}

/** Crea una preference de Checkout Pro (efectivo excluido, auto_return approved). */
export async function createPreference(
  input: CreatePreferenceInput,
  deps: MpDeps = {},
): Promise<MpPreference> {
  const { fetchFn, token } = resolveDeps(deps);
  const body = buildPreferenceBody(input, new Date());
  const res = await fetchFn(`${MP_API}/checkout/preferences`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok)
    throw new Error(
      `MP createPreference falló: ${res.status} ${await res.text()}`,
    );
  return (await res.json()) as MpPreference;
}

export interface MpPayment {
  id: string;
  status: string;
  external_reference?: string;
  transaction_amount?: number;
}

/** Consulta un pago por id (fuente de verdad del webhook). */
export async function getPayment(
  id: string,
  deps: MpDeps = {},
): Promise<MpPayment> {
  const { fetchFn, token } = resolveDeps(deps);
  const res = await fetchFn(`${MP_API}/v1/payments/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok)
    throw new Error(`MP getPayment falló: ${res.status} ${await res.text()}`);
  const raw = (await res.json()) as {
    id: number | string;
    status: string;
    external_reference?: string;
    transaction_amount?: number;
  };
  return {
    id: String(raw.id),
    status: raw.status,
    external_reference: raw.external_reference,
    transaction_amount: raw.transaction_amount,
  };
}

/** Mapea el status de un pago de MP al enum PaymentStatus. */
export function mpStatusToPaymentStatus(status: string): PaymentStatus {
  switch (status) {
    case "approved":
      return "approved";
    case "rejected":
      return "rejected";
    case "in_process":
    case "in_mediation":
      return "in_process";
    case "refunded":
    case "charged_back":
      return "refunded";
    case "cancelled":
      return "cancelled";
    default:
      return "pending";
  }
}
