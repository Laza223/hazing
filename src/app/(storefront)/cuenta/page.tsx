import Link from "next/link";
import { requireCustomer } from "@/lib/customer/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/money";
import { buttonVariants } from "@/components/ui/button";

export default async function CuentaHome({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const customer = await requireCustomer();
  // `/auth/confirm` manda acá con `?bienvenida=1` al confirmar el alta.
  const isWelcome = (await searchParams)["bienvenida"] === "1";
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
      {isWelcome ? (
        <div className="border border-ink px-6 py-10 md:px-10 md:py-14">
          <p className="tracking-caps-sm text-xs uppercase text-ink-3">
            Cuenta confirmada
          </p>
          <h2 className="mt-4 font-display text-3xl text-ink md:text-4xl">
            {customer.name
              ? `${customer.name}, ya sos parte de Hazing.`
              : "Ya sos parte de Hazing."}
          </h2>
          <p className="mt-4 max-w-prose text-ink-2">
            Desde tu cuenta seguís tus pedidos, guardás tus favoritos y la
            próxima compra te lleva menos tiempo.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-6">
            <Link href="/tienda" className={buttonVariants()}>
              Ver la tienda
            </Link>
            <Link
              href="/cuenta/datos"
              className={buttonVariants({ variant: "text", size: "sm" })}
            >
              Completar mis datos
            </Link>
          </div>
        </div>
      ) : (
        <p className="text-ink-2">
          Hola{customer.name ? `, ${customer.name}` : ""}
        </p>
      )}
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
