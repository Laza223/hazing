import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { RetractionCard, type RetractionItemView } from "./retraction-card";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminArrepentimientoPage() {
  const rows = await prisma.retractionRequest.findMany({
    orderBy: { createdAt: "desc" },
  });

  const pendingCount = rows.filter((r) => r.status === "pending").length;
  const processedCount = rows.filter((r) => r.status === "processed").length;

  const items: RetractionItemView[] = rows.map((r) => ({
    id: r.id,
    seq: r.seq,
    orderNumber: r.orderNumber,
    contactName: r.contactName,
    contactEmail: r.contactEmail,
    contactPhone: r.contactPhone,
    reason: r.reason,
    status: r.status,
    createdAt: r.createdAt,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Botón de Arrepentimiento"
        subtitle="Constancias de revocación de compra emitidas según la Res. 424/2020 (Art. 34 Ley 24.240)."
        action={
          <div className="flex items-center gap-2">
            {pendingCount > 0 ? <Badge>{pendingCount} pendientes</Badge> : null}
            <Badge>{processedCount} procesadas</Badge>
          </div>
        }
      />

      {items.length === 0 ? (
        <p className="rounded-control border border-dashed border-line p-12 text-center text-sm text-ink-3">
          No hay solicitudes de arrepentimiento. Cuando una clienta complete el
          formulario en la web, la constancia va a aparecer acá con todos sus
          datos de contacto.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {items.map((item) => (
            <li key={item.id}>
              <RetractionCard item={item} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
