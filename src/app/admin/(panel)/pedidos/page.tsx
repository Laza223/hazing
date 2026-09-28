import Link from "next/link";
import { Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatARS } from "@/lib/money";
import { toNumber } from "@/lib/catalog/pricing";
import { STATUS_LABELS } from "@/lib/admin/orders/service";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const FILTERS: Array<{ value: OrderStatus | "todos"; label: string }> = [
  { value: "todos", label: "Todos" },
  { value: "pending_payment", label: "Pendientes de pago" },
  { value: "paid", label: "Pagados" },
  { value: "preparing", label: "Preparando" },
  { value: "shipped", label: "Enviados" },
  { value: "delivered", label: "Entregados" },
  { value: "cancelled", label: "Cancelados" },
  { value: "refunded", label: "Reembolsados" },
];

const ART_FMT = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Argentina/Buenos_Aires",
});

function isStatus(v: string | undefined): v is OrderStatus {
  return v != null && Object.prototype.hasOwnProperty.call(STATUS_LABELS, v);
}

export default async function PedidosPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const estado = sp.estado;

  const [orders, counts] = await Promise.all([
    prisma.order.findMany({
      where: {
        ...(isStatus(estado) ? { status: estado } : {}),
        ...(q
          ? {
              OR: [
                { orderNumber: { contains: q, mode: "insensitive" as const } },
                { contactEmail: { contains: q, mode: "insensitive" as const } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        orderNumber: true,
        contactName: true,
        contactEmail: true,
        total: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const countByStatus = new Map(counts.map((c) => [c.status, c._count._all]));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pedidos"
        subtitle="Mirá los pedidos que hicieron tus clientas y cambiá su estado a medida que avanzan."
      />

      <div className="rounded-control border border-line bg-paper p-4">
        <form className="relative" action="/admin/pedidos" method="get">
          {estado && estado !== "todos" ? (
            <input type="hidden" name="estado" value={estado} />
          ) : null}
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3"
            aria-hidden
          />
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar por número de pedido o email"
            aria-label="Buscar pedidos"
            className="h-12 w-full rounded-control border border-line bg-paper pl-9 pr-3 text-base text-ink outline-none transition-colors duration-ui ease-ui placeholder:text-ink-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          />
        </form>

        <div className="mt-3 flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const active = (estado ?? "todos") === f.value;
            const href =
              f.value === "todos"
                ? "/admin/pedidos"
                : `/admin/pedidos?estado=${f.value}`;
            const count =
              f.value === "todos"
                ? orders.length
                : (countByStatus.get(f.value) ?? 0);
            return (
              <Link
                key={f.value}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-11 items-center gap-1.5 rounded-control border px-4 text-sm font-medium outline-none transition-colors duration-ui ease-ui focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
                  active
                    ? "border-ink bg-ink text-paper"
                    : "border-line text-ink-2 hover:bg-paper-2",
                )}
              >
                {f.label}
                <span className="tabular-nums">({count})</span>
              </Link>
            );
          })}
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-control border border-dashed border-line p-12 text-center">
          <p className="text-base font-medium text-ink">
            Todavía no hay pedidos para mostrar
          </p>
          <p className="mt-1 text-sm text-ink-3">
            Cuando entre un pedido va a aparecer acá. Probá quitar el filtro o
            la búsqueda.
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((o) => (
              <TableRow key={o.id}>
                <TableCell>
                  <Link
                    href={`/admin/pedidos/${o.id}`}
                    className="font-medium text-ink underline underline-offset-4 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                  >
                    {o.orderNumber}
                  </Link>
                </TableCell>
                <TableCell className="tabular-nums text-ink-3">
                  {ART_FMT.format(o.createdAt)}
                </TableCell>
                <TableCell>
                  <p>{o.contactName}</p>
                  <p className="text-xs text-ink-4">{o.contactEmail}</p>
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {formatARS(toNumber(o.total))}
                </TableCell>
                <TableCell>
                  <Badge>{STATUS_LABELS[o.status]}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
