"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { setCouponActiveAction } from "./actions";

/**
 * Botón rápido para activar/desactivar un cupón desde la lista, sin abrir el
 * formulario entero. Nunca borra: los cupones son baja lógica (`active`),
 * los pedidos ya emitidos siguen referenciándolo por `couponId`.
 */
export function CouponActiveToggle({
  id,
  active,
}: {
  id: string;
  active: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const toggle = () => {
    setError(null);
    startTransition(async () => {
      const r = await setCouponActiveAction(id, !active);
      if (!r.ok) setError(r.error ?? "No se pudo cambiar el estado.");
      else router.refresh();
    });
  };

  if (!active) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={toggle}
        disabled={pending}
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : null}
        Activar
      </Button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <ConfirmDialog
        trigger={
          <Button type="button" variant="outline" size="sm" disabled={pending}>
            Desactivar
          </Button>
        }
        title="¿Desactivar este cupón?"
        description="Las clientas van a dejar de poder usarlo al pagar. Podés volver a activarlo cuando quieras."
        confirmLabel="Sí, desactivar"
        onConfirm={toggle}
        pending={pending}
      />
      {error ? (
        <p className="flex items-center gap-1 text-xs text-ink-3">
          <AlertCircle className="size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : null}
    </div>
  );
}
