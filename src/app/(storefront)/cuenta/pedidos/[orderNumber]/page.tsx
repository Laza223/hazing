import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCustomer } from "@/lib/customer/auth";
import { customerOrderWhere } from "@/lib/customer/orders";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/money";

const STATUS_LABEL: Record<string, string> = {
  pending_payment: "Pago pendiente",
  paid: "Pagado",
  preparing: "Preparando",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
};

export default async function PedidoDetallePage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  const customer = await requireCustomer();
  const order = await prisma.order.findFirst({
    where: customerOrderWhere(orderNumber, customer.id),
    include: {
      items: {
        include: {
          variant: { include: { product: { select: { slug: true } } } },
        },
      },
      shipment: true,
    },
  });
  if (!order) notFound();

  return (
    <div className="max-w-xl space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl text-ink">{order.orderNumber}</h2>
        <span className="tracking-caps-sm text-xs uppercase text-ink-2">
          {STATUS_LABEL[order.status] ?? order.status}
        </span>
      </div>

      <ul className="space-y-2">
        {order.items.map((it) => {
          const slug = it.variant?.product.slug;
          const label = it.variantNameSnapshot
            ? `${it.productNameSnapshot} — ${it.variantNameSnapshot}`
            : it.productNameSnapshot;
          return (
            <li key={it.id} className="flex justify-between text-sm text-ink">
              <span>
                {slug ? (
                  <Link
                    href={`/producto/${slug}`}
                    className="underline underline-offset-4"
                  >
                    {label}
                  </Link>
                ) : (
                  label
                )}{" "}
                × {it.qty}
              </span>
              <span className="tabular-nums">
                {formatPrice(Number(it.lineTotal))}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="space-y-1 border-t border-line pt-3 text-sm text-ink">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span className="tabular-nums">
            {formatPrice(Number(order.subtotal))}
          </span>
        </div>
        {Number(order.discountTotal) > 0 && (
          <div className="flex justify-between">
            <span>Descuento</span>
            <span className="tabular-nums">
              -{formatPrice(Number(order.discountTotal))}
            </span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Envío</span>
          <span className="tabular-nums">
            {formatPrice(Number(order.shippingCost))}
          </span>
        </div>
        <div className="flex justify-between font-medium">
          <span>Total</span>
          <span className="tabular-nums">
            {formatPrice(Number(order.total))}
          </span>
        </div>
      </div>

      {order.shipment?.trackingNumber && (
        <p className="text-sm text-ink-2">
          Seguimiento:{" "}
          <strong className="text-ink">{order.shipment.trackingNumber}</strong>
          {order.shipment.carrier ? ` (${order.shipment.carrier})` : null}
        </p>
      )}
      <Link
        href="/cuenta/pedidos"
        className="inline-block text-sm text-ink underline underline-offset-4"
      >
        ← Volver a mis pedidos
      </Link>
    </div>
  );
}
