import Link from "next/link";
import {
  PackageCheck,
  Truck,
  Clock,
  Ticket,
  RotateCcw,
  Star,
  AlertTriangle,
} from "lucide-react";

import { PageHeader } from "@/components/admin/page-header";
import { PanelCard } from "@/components/admin/panel-card";
import { getActionData } from "@/lib/admin/dashboard/actions-queries";
import { formatARS } from "@/lib/money";

export const dynamic = "force-dynamic";

const LINK_CLASS =
  "flex items-center justify-between gap-4 px-5 py-3 outline-none transition-colors duration-ui ease-ui hover:bg-paper-2 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink";

const TAG_CLASS =
  "tracking-caps-sm shrink-0 rounded-control border border-line px-2 py-0.5 text-xs font-medium uppercase tabular-nums text-ink-2";

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-5 py-6 text-center text-sm text-ink-3">{children}</p>;
}

function Row({
  href,
  title,
  detail,
  tag,
}: {
  href: string;
  title: string;
  detail?: string;
  tag: string;
}) {
  return (
    <li>
      <Link href={href} className={LINK_CLASS}>
        <span className="min-w-0 truncate text-sm text-ink">
          {title}
          {detail ? (
            <span className="ml-2 text-xs tabular-nums text-ink-4">
              {detail}
            </span>
          ) : null}
        </span>
        <span className={TAG_CLASS}>{tag}</span>
      </Link>
    </li>
  );
}

export default async function AdminHomePage() {
  const data = await getActionData();

  const total =
    data.toPrepare.length +
    data.toDispatch.length +
    data.couponsExpiring.length +
    data.retractionsPending.length +
    data.reviewsPending +
    data.criticalStock.length;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Inicio"
        subtitle={
          total === 0
            ? "Todo al día: no hay nada que requiera tu atención ahora."
            : `Lo que tenés que hacer hoy: ${total} ${total === 1 ? "cosa pendiente" : "cosas pendientes"}.`
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PanelCard icon={PackageCheck} title="Pedidos a preparar">
          {data.toPrepare.length === 0 ? (
            <Empty>No hay pedidos pagados esperando que los armes.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {data.toPrepare.map((o) => (
                <Row
                  key={o.id}
                  href={`/admin/pedidos/${o.id}`}
                  title={`${o.orderNumber} · ${o.contactName}`}
                  detail={formatARS(o.total)}
                  tag={`Pagado ${o.age}`}
                />
              ))}
            </ul>
          )}
        </PanelCard>

        <PanelCard icon={Truck} title="Pedidos a despachar">
          {data.toDispatch.length === 0 ? (
            <Empty>No hay pedidos armados esperando para enviar.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {data.toDispatch.map((o) => (
                <Row
                  key={o.id}
                  href={`/admin/pedidos/${o.id}`}
                  title={`${o.orderNumber} · ${o.contactName}`}
                  detail={formatARS(o.total)}
                  tag={o.age}
                />
              ))}
            </ul>
          )}
        </PanelCard>

        <PanelCard icon={RotateCcw} title="Arrepentimientos sin responder">
          {data.retractionsPending.length === 0 ? (
            <Empty>No hay solicitudes pendientes.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {data.retractionsPending.map((r) => (
                <Row
                  key={r.id}
                  href="/admin/arrepentimiento"
                  title={`ARR-${String(r.seq).padStart(6, "0")} · ${r.contactName}`}
                  tag={r.age}
                />
              ))}
            </ul>
          )}
        </PanelCard>

        <PanelCard icon={Clock} title="Pagos por vencer">
          {data.unpaidExpiring.length === 0 ? (
            <Empty>
              No hay pedidos esperando pago. Los que no pagan en 24 h se
              cancelan solos.
            </Empty>
          ) : (
            <ul className="divide-y divide-line">
              {data.unpaidExpiring.map((o) => (
                <Row
                  key={o.id}
                  href={`/admin/pedidos/${o.id}`}
                  title={`${o.orderNumber} · ${o.contactName}`}
                  detail={formatARS(o.total)}
                  tag={o.deadline}
                />
              ))}
            </ul>
          )}
        </PanelCard>

        <PanelCard icon={Ticket} title="Cupones por vencer">
          {data.couponsExpiring.length === 0 ? (
            <Empty>Ningún cupón activo vence en los próximos 7 días.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {data.couponsExpiring.map((c) => (
                <Row
                  key={c.id}
                  href={`/admin/cupones/${c.id}`}
                  title={c.code}
                  tag={c.deadline}
                />
              ))}
            </ul>
          )}
        </PanelCard>

        <PanelCard icon={Star} title="Reseñas por moderar">
          {data.reviewsPending === 0 ? (
            <Empty>No hay reseñas esperando aprobación.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              <Row
                href="/admin/resenas"
                title="Reseñas pendientes de aprobar o rechazar"
                tag={String(data.reviewsPending)}
              />
            </ul>
          )}
        </PanelCard>
      </div>

      <PanelCard icon={AlertTriangle} title="Stock bajo">
        {data.criticalStock.length === 0 ? (
          <Empty>
            Todo en orden: ningún producto está por debajo de su stock mínimo.
          </Empty>
        ) : (
          <ul className="divide-y divide-line">
            {data.criticalStock.map((v) => (
              <Row
                key={v.id}
                href="/admin/productos"
                title={v.label}
                detail={v.sku}
                tag={`${v.stock} en stock`}
              />
            ))}
          </ul>
        )}
      </PanelCard>
    </div>
  );
}
