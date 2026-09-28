import Link from "next/link";
import { requireCustomer } from "@/lib/customer/auth";
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

export default async function PedidosPage() {
  const customer = await requireCustomer();
  const orders = await prisma.order.findMany({
    where: { customerId: customer.id },
    orderBy: { createdAt: "desc" },
    select: { orderNumber: true, total: true, status: true, createdAt: true },
  });

  if (orders.length === 0) {
    return (
      <div className="border border-dashed border-line p-8 text-center text-ink-2">
        <p>Todavía no hiciste ningún pedido.</p>
        <Link
          href="/tienda"
          className="mt-3 inline-block text-ink underline underline-offset-4"
        >
          Ver la tienda
        </Link>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {orders.map((o) => (
        <li key={o.orderNumber}>
          <Link
            href={`/cuenta/pedidos/${o.orderNumber}`}
            className="flex min-h-11 items-center justify-between border border-line p-4 outline-none transition-colors duration-ui ease-ui focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            <div>
              <p className="font-medium text-ink">{o.orderNumber}</p>
              <p className="text-xs text-ink-3">
                {o.createdAt.toLocaleDateString("es-AR")}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="tracking-caps-sm text-xs uppercase text-ink-2">
                {STATUS_LABEL[o.status] ?? o.status}
              </span>
              <span className="font-medium tabular-nums text-ink">
                {formatPrice(Number(o.total))}
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
