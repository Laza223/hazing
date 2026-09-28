"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, X, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { approveReviewAction, rejectReviewAction } from "./actions";

export function ReviewActionsButtons({
  id,
  slug,
}: {
  id: string;
  slug: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const approve = () =>
    startTransition(async () => {
      setError(null);
      const r = await approveReviewAction(id, slug);
      if (!r.ok) setError(r.error ?? "Error");
      else router.refresh();
    });

  const reject = () =>
    startTransition(async () => {
      setError(null);
      const r = await rejectReviewAction(id, slug);
      if (!r.ok) setError(r.error ?? "Error");
      else router.refresh();
    });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          onClick={approve}
          disabled={pending}
          size="sm"
          className="flex-1 gap-1.5"
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Check className="size-4" aria-hidden />
          )}
          Aprobar
        </Button>
        <ConfirmDialog
          trigger={
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              size="sm"
              className="flex-1 gap-1.5"
            >
              <X className="size-4" aria-hidden />
              Rechazar
            </Button>
          }
          title="Rechazar reseña"
          description="La reseña no se publica en la tienda. Podés cambiarla más adelante volviendo a moderarla."
          confirmLabel="Sí, rechazar"
          onConfirm={reject}
          pending={pending}
        />
      </div>
      {error && (
        <p className="flex items-center gap-1.5 text-xs text-ink-3">
          <AlertCircle className="size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </div>
  );
}
