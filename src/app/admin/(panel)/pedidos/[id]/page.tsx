import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, MessageCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { formatARS } from "@/lib/money";
import { toNumber } from "@/lib/catalog/pricing";
import { STATUS_LABELS } from "@/lib/admin/orders/service";
import { OrderStatusControl } from "../order-status-control";
import { DispatchForm } from "../dispatch-form";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PAYMENT_LABELS: Record<string, string> = {
  pending: "Pendiente",
  approved: "Aprobado",
  rejected: "Rechazado",
  in_process: "En proceso",
  refunded: "Reembolsado",
  cancelled: "Cancelado",
};

const SHIPMENT_LABELS: Record<string, string> = {
  pending: "Sin preparar",
  ready: "Lista para despachar",
  dispatched: "Despachada",
  in_transit: "En camino",
  delivered: "Entregada",
  returned: "Devuelta",
};

const ART_FMT = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Argentina/Buenos_Aires",
});

interface AddressSnapshot {
  cp?: string;
  province?: string | null;
  street?: string;
  number?: string;
  floorApt?: string | null;
  city?: string;
  notes?: string | null;
}

function SectionCard({
  title,
  help,
  children,
}: {
  title: string;
  help?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-control border border-line bg-paper">
      <header className="border-b border-line px-5 py-3.5">
        <h2 className="text-base font-medium text-ink">{title}</h2>
        {help ? <p className="mt-0.5 text-xs text-ink-3">{help}</p> : null}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

/** Número de WhatsApp en formato `wa.me` (solo dígitos, sin `+` ni espacios). */
function waNumber(phone: string): string {
  return phone.replace(/\D/g, "");
}

export default async function PedidoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
      payments: { orderBy: { createdAt: "desc" } },
      shipment: true,
      coupon: { select: { code: true } },
      shippingZone: { select: { name: true } },
    },
  });
  if (!order) notFound();

  const addr = (order.shippingAddress ?? {}) as AddressSnapshot;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Pedido ${order.orderNumber}`}
        subtitle="Mirá el detalle del pedido y cambiá su estado a medida que lo preparás."
        action={
          <Link
            href="/admin/pedidos"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <ArrowLeft className="size-4" aria-hidden /> Volver a pedidos
          </Link>
        }
      />

      <SectionCard
        title="Estado del pedido"
        help="El próximo paso depende del estado actual. Una acción a la vez."
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-sm text-ink-3">
            Estado actual: <Badge>{STATUS_LABELS[order.status]}</Badge>
          </div>
          <OrderStatusControl orderId={order.id} status={order.status} />
        </div>
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Productos">
          <ul className="divide-y divide-line">
            {order.items.map((it) => (
              <li
                key={it.id}
                className="flex items-start justify-between gap-4 py-3 first:pt-0"
              >
                <div className="min-w-0">
                  <p className="font-medium text-ink">
                    {it.productNameSnapshot}
                  </p>
                  {it.variantNameSnapshot ? (
                    <p className="text-sm text-ink-3">
                      {it.variantNameSnapshot}
                    </p>
                  ) : null}
                  {it.skuSnapshot ? (
                    <p className="text-xs tabular-nums text-ink-4">
                      SKU {it.skuSnapshot}
                    </p>
                  ) : null}
                  <p className="mt-0.5 text-sm tabular-nums text-ink-3">
                    {it.qty} × {formatARS(toNumber(it.unitPriceSnapshot))}
                  </p>
                </div>
                <p className="shrink-0 font-medium tabular-nums">
                  {formatARS(toNumber(it.lineTotal))}
                </p>
              </li>
            ))}
          </ul>

          <dl className="mt-4 space-y-1.5 rounded-control bg-paper-2 p-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-3">Subtotal</dt>
              <dd className="tabular-nums">
                {formatARS(toNumber(order.subtotal))}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-3">Envío</dt>
              <dd className="tabular-nums">
                {formatARS(toNumber(order.shippingCost))}
              </dd>
            </div>
            {toNumber(order.discountTotal) > 0 ? (
              <div className="flex justify-between">
                <dt className="text-ink-3">
                  Descuento{order.coupon ? ` (${order.coupon.code})` : ""}
                </dt>
                <dd className="tabular-nums">
                  −{formatARS(toNumber(order.discountTotal))}
                </dd>
              </div>
            ) : null}
            <div className="mt-1 flex items-center justify-between border-t border-line pt-2 text-base font-medium text-ink">
              <dt>Total</dt>
              <dd className="tabular-nums">
                {formatARS(toNumber(order.total))}
              </dd>
            </div>
          </dl>
        </SectionCard>

        <div className="space-y-6">
          <SectionCard title="Cliente">
            <p className="font-medium text-ink">{order.contactName}</p>
            <div className="mt-1 flex flex-col gap-1 text-sm text-ink-3">
              <a
                href={`mailto:${order.contactEmail}`}
                className="inline-flex w-fit items-center gap-1.5 underline underline-offset-4 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                <Mail className="size-3.5" aria-hidden /> {order.contactEmail}
              </a>
              <a
                href={`tel:${order.contactPhone}`}
                className="inline-flex w-fit items-center gap-1.5 tabular-nums underline underline-offset-4 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                <Phone className="size-3.5" aria-hidden /> {order.contactPhone}
              </a>
              <a
                href={`https://wa.me/${waNumber(order.contactPhone)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-fit items-center gap-1.5 underline underline-offset-4 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                <MessageCircle className="size-3.5" aria-hidden /> Escribir por
                WhatsApp
              </a>
            </div>
            <p className="mt-2 text-sm tabular-nums text-ink-4">
              Recibido: {ART_FMT.format(order.createdAt)}
            </p>
          </SectionCard>

          <SectionCard title="Entrega">
            <p className="text-sm text-ink">
              Método:{" "}
              <span className="font-medium">
                {order.shippingMethod === "domicilio"
                  ? "Envío a domicilio"
                  : order.shippingMethod === "retiro"
                    ? "Retiro en Luján"
                    : "Retiro en sucursal"}
              </span>
              {order.shippingZone ? ` · ${order.shippingZone.name}` : ""}
            </p>
            {order.shippingMethod === "retiro" ? (
              <p className="mt-1 text-sm text-ink-3">
                Coordinar día y hora por WhatsApp.
              </p>
            ) : order.shippingMethod === "domicilio" ? (
              <address className="mt-1 text-sm not-italic text-ink-3">
                {[addr.street, addr.number].filter(Boolean).join(" ")}
                {addr.floorApt ? `, ${addr.floorApt}` : ""}
                <br />
                {[addr.city, addr.province].filter(Boolean).join(", ")}{" "}
                {addr.cp ? `(CP ${addr.cp})` : ""}
                {addr.notes ? (
                  <>
                    <br />
                    Nota: {addr.notes}
                  </>
                ) : null}
              </address>
            ) : (
              <p className="mt-1 text-sm text-ink-3">
                CP de referencia: {addr.cp ?? "—"}
              </p>
            )}
            <p className="mt-2 text-sm tabular-nums text-ink-3">
              Costo de envío: {formatARS(toNumber(order.shippingCost))}
            </p>
            {order.shipment ? (
              <p className="mt-1 text-sm text-ink-3">
                Envío:{" "}
                <Badge>
                  {SHIPMENT_LABELS[order.shipment.status] ??
                    order.shipment.status}
                </Badge>
                {order.shipment.carrier ? ` · ${order.shipment.carrier}` : ""}
                {order.shipment.trackingNumber
                  ? ` · Seguimiento: ${order.shipment.trackingNumber}`
                  : ""}
                {order.shipment.trackingUrl ? (
                  <>
                    {" · "}
                    <a
                      href={order.shipment.trackingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="underline underline-offset-4 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                    >
                      Link de seguimiento
                    </a>
                  </>
                ) : null}
              </p>
            ) : (
              <p className="mt-1 text-sm text-ink-4">
                Todavía no se cargó el despacho.
              </p>
            )}
            {order.shippingMethod !== "retiro" &&
            ["paid", "preparing", "shipped"].includes(order.status) ? (
              <div className="mt-4 border-t border-line pt-4">
                <DispatchForm
                  key={`${order.status}-${order.shipment?.trackingNumber ?? ""}`}
                  orderId={order.id}
                  alreadyShipped={order.status === "shipped"}
                  initial={{
                    carrier: order.shipment?.carrier ?? "",
                    trackingNumber: order.shipment?.trackingNumber ?? "",
                    trackingUrl: order.shipment?.trackingUrl ?? "",
                  }}
                />
              </div>
            ) : null}
          </SectionCard>

          <SectionCard title="Pagos (Mercado Pago)">
            {order.payments.length === 0 ? (
              <p className="text-sm text-ink-3">
                Todavía no hay pagos registrados.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {order.payments.map((p) => (
                  <li
                    key={p.id}
                    className="flex flex-wrap items-center justify-between gap-2 text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <Badge>{PAYMENT_LABELS[p.status] ?? p.status}</Badge>
                      {p.mpPaymentId ? (
                        <span className="text-xs tabular-nums text-ink-4">
                          #{p.mpPaymentId}
                        </span>
                      ) : null}
                    </span>
                    <span className="font-medium tabular-nums">
                      {formatARS(toNumber(p.amount))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
