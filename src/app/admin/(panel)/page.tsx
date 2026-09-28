import Link from "next/link";
import {
  DollarSign,
  CalendarRange,
  CalendarDays,
  PackageCheck,
  Truck,
  Receipt,
  TrendingUp,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";

import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { getDashboardData } from "@/lib/admin/dashboard/queries";
import { formatARS } from "@/lib/money";

export const dynamic = "force-dynamic";

function SectionTitle({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <h2 className="flex items-center gap-2 text-base font-medium text-ink">
      <Icon className="size-[18px] text-ink-3" aria-hidden />
      {children}
    </h2>
  );
}

function PanelCard({
  icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-control border border-line bg-paper">
      <header className="border-b border-line px-5 py-3.5">
        <SectionTitle icon={icon}>{title}</SectionTitle>
      </header>
      {children}
    </section>
  );
}

export default async function AdminDashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Inicio"
        subtitle="Un vistazo rápido a tus ventas y a lo que tenés que hacer hoy."
      />

      <section className="space-y-3">
        <SectionTitle icon={DollarSign}>Ventas</SectionTitle>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            title="Ventas de hoy"
            value={formatARS(data.sales.today)}
            hint="Lo que vendiste desde la medianoche."
            icon={DollarSign}
          />
          <StatCard
            title="Ventas de la semana"
            value={formatARS(data.sales.week)}
            hint="Desde el lunes hasta ahora."
            icon={CalendarRange}
          />
          <StatCard
            title="Ventas del mes"
            value={formatARS(data.sales.month)}
            hint="Desde el día 1 del mes."
            icon={CalendarDays}
          />
        </div>
      </section>

      <section className="space-y-3">
        <SectionTitle icon={PackageCheck}>Para hacer</SectionTitle>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            title="Pedidos a preparar"
            value={String(data.pending.toPrepare)}
            hint="Ya pagados, esperando que los armes."
            icon={PackageCheck}
          />
          <StatCard
            title="Pedidos a despachar"
            value={String(data.pending.toDispatch)}
            hint="Armados, listos para enviar."
            icon={Truck}
          />
          <StatCard
            title="Ticket promedio (mes)"
            value={formatARS(data.averageTicketMonth)}
            hint="Cuánto gasta en promedio cada clienta."
            icon={Receipt}
          />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PanelCard icon={TrendingUp} title="Más vendidos del mes">
          {data.topProductsMonth.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-ink-3">
              Todavía no hay ventas este mes. Cuando vendas, acá vas a ver tus
              productos más pedidos.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {data.topProductsMonth.map((p, i) => (
                <li key={p.label} className="flex items-center gap-3 px-5 py-3">
                  <span className="shrink-0 text-xs font-medium tabular-nums text-ink-4">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-ink">
                    {p.label}
                  </span>
                  <span className="tracking-caps-sm shrink-0 rounded-control border border-line px-2 py-0.5 text-xs font-medium uppercase tabular-nums text-ink-2">
                    {p.qty} u.
                  </span>
                </li>
              ))}
            </ul>
          )}
        </PanelCard>

        <PanelCard icon={AlertTriangle} title="Stock bajo">
          {data.criticalStock.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-ink-3">
              Todo en orden: ningún producto está por debajo de su stock mínimo.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {data.criticalStock.map((v) => (
                <li
                  key={v.id}
                  className="flex items-center justify-between gap-4 px-5 py-3"
                >
                  <Link
                    href="/admin/productos"
                    className="min-w-0 truncate text-sm font-medium text-ink underline underline-offset-4 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                  >
                    {v.label}
                    <span className="ml-2 text-xs font-normal tabular-nums text-ink-4">
                      {v.sku}
                    </span>
                  </Link>
                  <span className="tracking-caps-sm inline-flex shrink-0 items-center gap-1 rounded-control border border-line px-2 py-0.5 text-xs font-medium uppercase tabular-nums text-ink-2">
                    <AlertTriangle className="size-3" aria-hidden />
                    {v.stock} en stock
                  </span>
                </li>
              ))}
            </ul>
          )}
        </PanelCard>
      </div>
    </div>
  );
}
