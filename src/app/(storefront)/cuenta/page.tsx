import Link from "next/link";
import { requireCustomer } from "@/lib/customer/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/money";

export default async function CuentaHome() {
  const customer = await requireCustomer();
  const [orders, wishlistCount] = await Promise.all([
    prisma.order.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { orderNumber: true, total: true, status: true },
    }),
    prisma.wishlist.count({ where: { customerId: customer.id } }),
  ]);

  return (
    <div className="space-y-6">
      <p className="text-ink-2">
        Hola{customer.name ? `, ${customer.name}` : ""}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/cuenta/pedidos" className="border border-line p-4">
          <p className="tracking-caps-sm text-xs uppercase text-ink-3">
            Últimos pedidos
          </p>
          {orders.length === 0 ? (
            <p className="mt-2 text-sm text-ink-2">Todavía no tenés pedidos.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm text-ink">
              {orders.map((o) => (
                <li key={o.orderNumber} className="flex justify-between">
                  <span>{o.orderNumber}</span>
                  <span className="tabular-nums">
                    {formatPrice(Number(o.total))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Link>
        <Link href="/cuenta/favoritos" className="border border-line p-4">
          <p className="tracking-caps-sm text-xs uppercase text-ink-3">
            Favoritos
          </p>
          <p className="mt-2 font-display text-2xl text-ink">{wishlistCount}</p>
        </Link>
      </div>
    </div>
  );
}
