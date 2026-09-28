"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { deleteProductAction } from "@/app/admin/(panel)/productos/actions";

/** Baja lógica (docs/spec/07-admin.md §3.7): nunca borra la fila, `OrderItem` apunta a variantes. */
export function DeleteProductButton({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onConfirm = () =>
    startTransition(async () => {
      setError(null);
      const r = await deleteProductAction(id);
      if (!r.ok) setError(r.error ?? "No se pudo dar de baja el producto.");
      else router.push("/admin/productos");
    });

  return (
    <div className="space-y-2">
      <ConfirmDialog
        trigger={
          <Button type="button" variant="outline" disabled={pending}>
            <Trash2 className="size-4" aria-hidden /> Dar de baja
          </Button>
        }
        title="Dar de baja el producto"
        description={`"${name}" deja de verse en la tienda. Los pedidos ya hechos con este producto no se ven afectados.`}
        confirmLabel="Sí, dar de baja"
        onConfirm={onConfirm}
        pending={pending}
      />
      {error && (
        <p
          role="alert"
          className="flex items-center gap-1.5 text-xs text-ink-3"
        >
          <AlertCircle className="size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </div>
  );
}
