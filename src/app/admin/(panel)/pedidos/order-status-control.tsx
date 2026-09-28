"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { canTransition } from "@/lib/orders/state-machine";
import { changeOrderStatusAction } from "./actions";
import type { OrderStatus } from "@prisma/client";

const ALL: OrderStatus[] = [
  "pending_payment",
  "paid",
  "preparing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
];

/** Texto claro por estado destino — nunca el nombre técnico del enum. */
const NEXT_LABELS: Record<OrderStatus, string> = {
  pending_payment: "Marcar pendiente de pago",
  paid: "Marcar como pagado",
  preparing: "Marcar en preparación",
  shipped: "Marcar como enviado",
  delivered: "Marcar como entregado",
  cancelled: "Cancelar pedido",
  refunded: "Marcar reembolsado",
};

/** Controles de cambio de estado — solo se muestran los botones que `canTransition` habilita. */
export function OrderStatusControl({
  orderId,
  status,
}: {
  orderId: string;
  status: OrderStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Estados con transición simple (sin reposición de stock).
  const nextStates = ALL.filter(
    (s) => s !== "cancelled" && s !== "refunded" && canTransition(status, s),
  );
  const canCancel = canTransition(status, "cancelled");
  const canRefund = canTransition(status, "refunded");

  const change = (to: OrderStatus) => {
    setError(null);
    startTransition(async () => {
      const r = await changeOrderStatusAction(orderId, to);
      if (!r.ok) setError(r.error ?? "No se pudo cambiar el estado.");
      else router.refresh();
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {nextStates.length === 0 && !canCancel && !canRefund ? (
          <p className="text-sm text-ink-3">
            Este pedido no tiene próximos estados disponibles.
          </p>
        ) : null}
        {nextStates.map((s) => (
          <Button
            key={s}
            type="button"
            size="sm"
            onClick={() => change(s)}
            disabled={pending}
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : null}
            {NEXT_LABELS[s]}
          </Button>
        ))}
        {canCancel ? (
          <ConfirmDialog
            trigger={
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
              >
                Cancelar pedido
              </Button>
            }
            title="¿Cancelar este pedido?"
            description="Si el pedido ya estaba pagado, se repone el stock de las variantes. Esta acción no se puede deshacer."
            confirmLabel="Sí, cancelar pedido"
            onConfirm={() => change("cancelled")}
            pending={pending}
          />
        ) : null}
        {canRefund ? (
          <ConfirmDialog
            trigger={
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
              >
                Marcar reembolsado
              </Button>
            }
            title="¿Marcar este pedido como reembolsado?"
            description="Registrá esto después de hacer el reembolso a mano en Mercado Pago. Se repone el stock de las variantes. Esta acción no se puede deshacer."
            confirmLabel="Sí, marcar reembolsado"
            onConfirm={() => change("refunded")}
            pending={pending}
          />
        ) : null}
      </div>
      {error ? (
        <p className="flex items-center gap-1.5 text-sm text-ink-3">
          <AlertCircle className="size-4 shrink-0" aria-hidden />
          {error}
        </p>
      ) : null}
    </div>
  );
}
