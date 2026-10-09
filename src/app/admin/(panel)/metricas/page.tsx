import { requireAdmin } from "@/lib/admin/auth";
import {
  DollarSign,
  CalendarRange,
  CalendarDays,
  Receipt,
  ShoppingBag,
  TrendingUp,
  ListChecks,
  type LucideIcon,
} from "lucide-react";

import { PageHeader } from "@/components/admin/page-header";
import { PanelCard, SectionTitle } from "@/components/admin/panel-card";
import { StatCard } from "@/components/admin/stat-card";
import { getDashboardData } from "@/lib/admin/dashboard/queries";
import { STATUS_LABELS } from "@/lib/admin/orders/service";
import { formatARS } from "@/lib/money";
import type { OrderStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const FUNNEL_ORDER: OrderStatus[] = [
  "pending_payment",
  "paid",
  "preparing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
];

function changeText(pct: number | null): string {
  if (pct === null) return "Sin ventas el mes pasado para comparar.";
  if (pct === 0) return "Igual que el mismo período del mes pasado.";
  const sign = pct > 0 ? "+" : "−";
  return `${sign}${Math.abs(pct)} % vs el mismo período del mes pasado.`;
}

export default async function AdminMetricsPage() {
  await requireAdmin();
  const data = await getDashboardData();
  const maxFunnel = Math.max(1, ...Object.values(data.statusFunnelMonth));

  const sections: {
    icon: LucideIcon;
    title: string;
    cards: { title: string; value: string; hint: string; icon: LucideIcon }[];
  }[] = [
    {
      icon: DollarSign,
      title: "Ventas",
      cards: [
        {
          title: "Ventas de hoy",
          value: formatARS(data.sales.today),
          hint: "Lo que vendiste desde la medianoche.",
          icon: DollarSign,
        },
        {
          title: "Ventas de la semana",
          value: formatARS(data.sales.week),
          hint: "Desde el lunes hasta ahora.",
          icon: CalendarRange,
        },
        {
          title: "Ventas del mes",
          value: formatARS(data.sales.month),
          hint: changeText(data.monthChangePct),
          icon: CalendarDays,
        },
      ],
    },
    {
      icon: ShoppingBag,
      title: "Clientas",
      cards: [
        {
          title: "Pedidos pagados (mes)",
          value: String(data.paidOrdersMonth),
          hint: "Pedidos que ya pagaron, sin contar cancelados.",
          icon: ShoppingBag,
        },
        {
          title: "Ticket promedio (mes)",
          value: formatARS(data.averageTicketMonth),
          hint: "Cuánto gasta en promedio cada clienta.",
          icon: Receipt,
        },
        {
          title: "Mes pasado (mismo período)",
          value: formatARS(data.prevMonthSamePeriod),
          hint: "Ventas del mes anterior hasta este mismo día y hora.",
          icon: CalendarDays,
        },
      ],
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Métricas"
        subtitle="Cómo viene el negocio: ventas, pedidos y qué se vende más."
      />

      {sections.map((s) => (
        <section key={s.title} className="space-y-3">
          <SectionTitle icon={s.icon}>{s.title}</SectionTitle>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {s.cards.map((c) => (
              <StatCard key={c.title} {...c} />
            ))}
          </div>
        </section>
      ))}

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

        <PanelCard icon={ListChecks} title="Pedidos del mes por estado">
          <ul className="divide-y divide-line">
            {FUNNEL_ORDER.map((status) => {
              const count = data.statusFunnelMonth[status];
              return (
                <li key={status} className="space-y-1.5 px-5 py-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-ink">{STATUS_LABELS[status]}</span>
                    <span className="tabular-nums text-ink-2">{count}</span>
                  </div>
                  <div className="h-1 bg-paper-2" aria-hidden>
                    <div
                      className="h-full bg-ink"
                      style={{ width: `${(count / maxFunnel) * 100}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </PanelCard>
      </div>
    </div>
  );
}
