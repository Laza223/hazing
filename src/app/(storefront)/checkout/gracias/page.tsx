import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Clock, XCircle } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/money";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  resolveCheckoutResultStatus,
  buildRetryUrl,
  isOrderId,
} from "@/lib/orders/checkout-result";
import { PendingRefresh } from "@/app/(storefront)/checkout/gracias/pending-refresh";

export const metadata: Metadata = { title: "Tu pedido" };

/**
 * GraciasPage — única ruta de resultado (docs/spec/08-checkout.md §3.5): lee
 * el estado REAL del pedido en la DB (fuente de verdad = webhook), nunca el
 * query param de MP. Solo muestra datos no sensibles: número, estado, ítems
 * y total — nunca dirección ni email completos.
 */
export default async function GraciasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const orderId = sp["pedido"];
  // UUID inválido (o ausente) → ni se consulta la DB, para no dar pie a
  // enumeración con valores adivinados.
  const order = isOrderId(orderId)
    ? await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: true,
          payments: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      })
    : null;

  if (!order) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <h1 className="font-display text-2xl text-ink">
          No encontramos ese pedido
        </h1>
        <p className="mt-2 text-ink-2">
          Si completaste el pago, te enviamos la confirmación por email.
        </p>
        <Link href="/tienda" className={cn(buttonVariants(), "mt-8")}>
          Seguir comprando
        </Link>
      </div>
    );
  }

  const lastPayment = order.payments[0] ?? null;
  const status = resolveCheckoutResultStatus(order, lastPayment);
  // analytics: purchase (PostHog, Fase 10 — se dispara acá cuando status === "paid",
  // ver docs/spec/08-checkout.md §3.8).
  const canRetry =
    status === "failed" &&
    order.status === "pending_payment" &&
    Boolean(lastPayment?.mpPreferenceId);

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      {status === "pending" && <PendingRefresh />}

      {status === "paid" && (
        <CheckCircle2 className="mx-auto size-14 text-ink" aria-hidden />
      )}
      {status === "pending" && (
        <Clock className="mx-auto size-14 text-ink-3" aria-hidden />
      )}
      {status === "failed" && (
        <XCircle className="mx-auto size-14 text-ink-3" aria-hidden />
      )}

      <h1 className="mt-4 font-display text-2xl text-ink">
        {status === "paid" &&
          `¡Gracias! Tu pedido ${order.orderNumber} está confirmado`}
        {status === "pending" && "Estamos confirmando tu pago"}
        {status === "failed" && "El pago no se completó"}
      </h1>

      <p className="mt-2 text-ink-2">
        Pedido <strong className="text-ink">{order.orderNumber}</strong>
        {status === "paid" && " — te mandamos el detalle por email."}
        {status === "pending" &&
          " — apenas se acredite, te llega el email de confirmación."}
      </p>

      <div className="mx-auto mt-8 max-w-sm border border-line p-5 text-left text-sm">
        <ul className="space-y-1">
          {order.items.map((it) => (
            <li key={it.id} className="flex justify-between gap-2 text-ink-2">
              <span>
                {it.productNameSnapshot}
                {it.variantNameSnapshot
                  ? ` — ${it.variantNameSnapshot}`
                  : ""} × {it.qty}
              </span>
              <span className="tabular-nums text-ink">
                {formatPrice(Number(it.lineTotal))}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex justify-between border-t border-line pt-3 font-medium text-ink">
          <span>Total</span>
          <span className="tabular-nums">
            {formatPrice(Number(order.total))}
          </span>
        </div>
      </div>

      <div className="mt-8 flex flex-col items-center gap-3">
        {canRetry && lastPayment?.mpPreferenceId && (
          <a
            href={buildRetryUrl(lastPayment.mpPreferenceId)}
            className={cn(buttonVariants(), "w-full max-w-xs")}
          >
            Volver a intentar
          </a>
        )}
        <Link
          href="/tienda"
          className={cn(
            buttonVariants({ variant: canRetry ? "outline" : "solid" }),
            "w-full max-w-xs",
          )}
        >
          Seguir comprando
        </Link>
      </div>
    </div>
  );
}
