import { formatARS } from "@/lib/money";

/** Escapa HTML para interpolar texto del usuario en cuerpos de email (anti-inyección). */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface OrderEmailItem {
  name: string;
  variantName?: string | null;
  qty: number;
  lineTotal: number;
}
export interface OrderEmailData {
  orderNumber: string;
  contactName: string;
  contactEmail: string;
  items: OrderEmailItem[];
  subtotal: number;
  shippingCost: number;
  discountTotal: number;
  total: number;
  shippingMethod: string;
  oversoldLines?: Array<{ name: string }>;
  /** Monto realmente acreditado por MP (para reconciliar contra `total` en la alerta a la dueña). */
  amountPaid?: number;
}
export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

function itemLabel(it: OrderEmailItem): string {
  return it.variantName ? `${it.name} — ${it.variantName}` : it.name;
}
function itemsHtml(items: OrderEmailItem[]): string {
  return items
    .map(
      (it) =>
        `<tr><td>${itemLabel(it)} × ${it.qty}</td><td style="text-align:right">${formatARS(it.lineTotal)}</td></tr>`,
    )
    .join("");
}
function itemsText(items: OrderEmailItem[]): string {
  return items
    .map((it) => `- ${itemLabel(it)} × ${it.qty}: ${formatARS(it.lineTotal)}`)
    .join("\n");
}
function totalsBlock(d: OrderEmailData): string {
  const rows = [
    ["Subtotal", d.subtotal],
    ...(d.discountTotal > 0 ? [["Descuento", -d.discountTotal] as const] : []),
    ["Envío", d.shippingCost],
    ["Total", d.total],
  ] as Array<readonly [string, number]>;
  return rows
    .map(
      ([k, v]) =>
        `<tr><td>${k}</td><td style="text-align:right">${formatARS(v)}</td></tr>`,
    )
    .join("");
}

// Estilo mínimo, monocromo (ver docs/spec/00-handoff.md §8) — los clientes de email no
// soportan @font-face de forma confiable, así que se usa una pila de sistema sobria en
// vez de Inter/Archivo; el negro es #171717 (ink), nunca #000 puro, igual que el resto del sitio.
const INK = "#171717";

/** Email de confirmación a la clienta. */
export function orderConfirmationEmail(d: OrderEmailData): EmailContent {
  const subject = `Recibimos tu pedido ${d.orderNumber} — Hazing`;
  const html = `<div style="font-family:Georgia,serif;color:${INK}">
    <h1 style="font-weight:400;text-transform:uppercase;letter-spacing:0.08em">Hazing</h1>
    <p>Hola ${escapeHtml(d.contactName)}. Recibimos tu pedido <strong>${d.orderNumber}</strong>. Te avisamos cuando lo despachemos.</p>
    <table style="width:100%;border-collapse:collapse">${itemsHtml(d.items)}</table>
    <hr style="border:none;border-top:1px solid #D4D4D4"/>
    <table style="width:100%;border-collapse:collapse">${totalsBlock(d)}</table>
    <p>Envío: ${d.shippingMethod}.</p>
    <p>Cualquier duda, escribinos por WhatsApp.</p>
  </div>`;
  const text = `Hazing\n\nHola ${d.contactName}. Recibimos tu pedido ${d.orderNumber}\n\n${itemsText(d.items)}\n\nSubtotal: ${formatARS(d.subtotal)}\nDescuento: ${formatARS(d.discountTotal)}\nEnvío: ${formatARS(d.shippingCost)}\nTotal: ${formatARS(d.total)}\nEnvío: ${d.shippingMethod}`;
  return { subject, html, text };
}

/** Email de alerta a la dueña (nuevo pedido pagado), con alerta de oversell si corresponde. */
export function newOrderAlertEmail(d: OrderEmailData): EmailContent {
  const oversell = d.oversoldLines && d.oversoldLines.length > 0;
  const amountMismatch =
    d.amountPaid != null && Math.abs(d.amountPaid - d.total) > 0.01;
  const needsReview = oversell || amountMismatch;
  const subject = needsReview
    ? `Nuevo pedido ${d.orderNumber} — REVISAR`
    : `Nuevo pedido pagado ${d.orderNumber} (${formatARS(d.total)})`;
  const oversellHtml = oversell
    ? `<div style="border:1px solid ${INK};padding:8px">
        <strong>Oversell:</strong> sin stock suficiente para:
        <ul>${d.oversoldLines!.map((l) => `<li>${escapeHtml(l.name)}</li>`).join("")}</ul>
        Coordinar con la clienta por WhatsApp.
      </div>`
    : "";
  const amountHtml = amountMismatch
    ? `<div style="border:1px solid ${INK};padding:8px">
        <strong>Monto:</strong> MP acreditó ${formatARS(d.amountPaid!)} pero el total del pedido es ${formatARS(d.total)}. Revisar antes de despachar.
      </div>`
    : "";
  const html = `<div style="font-family:Georgia,serif;color:${INK}">
    <h1 style="font-weight:400">Nuevo pedido ${d.orderNumber}</h1>
    ${oversellHtml}
    ${amountHtml}
    <p>Cliente: ${escapeHtml(d.contactName)} — ${escapeHtml(d.contactEmail)}</p>
    <table style="width:100%;border-collapse:collapse">${itemsHtml(d.items)}</table>
    <table style="width:100%;border-collapse:collapse">${totalsBlock(d)}</table>
    <p>Envío: ${d.shippingMethod}.</p>
  </div>`;
  const text = `Nuevo pedido ${d.orderNumber}\nCliente: ${d.contactName} (${d.contactEmail})\nTotal: ${formatARS(d.total)}${oversell ? `\nOVERSELL: ${d.oversoldLines!.map((l) => l.name).join(", ")}` : ""}${amountMismatch ? `\nMONTO: acreditado ${formatARS(d.amountPaid!)} ≠ total ${formatARS(d.total)}` : ""}`;
  return { subject, html, text };
}

export interface AbandonedCartEmailData {
  name?: string | null;
  items: OrderEmailItem[];
  recoverUrl: string;
}

/** Email de recupero de carrito abandonado (un único recordatorio a 24h). */
export function abandonedCartEmail(d: AbandonedCartEmailData): EmailContent {
  const hi = d.name ? `${escapeHtml(d.name)}, ` : "";
  const subject = "Te quedó algo en el carrito — Hazing";
  const rows = d.items
    .map(
      (it) =>
        `<tr><td>${itemLabel(it)} × ${it.qty}</td><td style="text-align:right">${formatARS(it.lineTotal)}</td></tr>`,
    )
    .join("");
  const html = `<div style="font-family:Georgia,serif;color:${INK}">
    <h1 style="font-weight:400">${hi}¿lo dejamos para después?</h1>
    <p>Guardamos tu carrito. Estos productos te están esperando:</p>
    <table style="width:100%;border-collapse:collapse">${rows}</table>
    <p style="margin-top:16px">
      <a href="${d.recoverUrl}" style="background:${INK};color:#fff;padding:12px 20px;text-decoration:none;display:inline-block">Volver a mi carrito</a>
    </p>
    <p style="font-size:12px;color:#737373">Si ya compraste o no te interesa, ignorá este mensaje.</p>
  </div>`;
  const text = `${hi}te quedó algo en el carrito:\n\n${d.items.map((it) => `- ${itemLabel(it)} × ${it.qty}: ${formatARS(it.lineTotal)}`).join("\n")}\n\nVolvé a tu carrito: ${d.recoverUrl}`;
  return { subject, html, text };
}
