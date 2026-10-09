"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { TextInput } from "@/components/ui/text-input";
import { Button } from "@/components/ui/button";
import {
  applyCouponAction,
  removeCouponAction,
} from "@/app/(storefront)/actions";

export function CouponForm({
  applied,
  rejected = null,
}: {
  applied: string | null;
  /** Por qué el cupón de la cookie no aplica: se muestra el motivo; la cookie se limpia solo si es permanente. */
  rejected?: { reason: string; permanent: boolean } | null;
}) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [rejectedNotice, setRejectedNotice] = useState(
    rejected?.reason ?? null,
  );

  const rejectedReason = rejected?.reason ?? null;
  const rejectedPermanent = rejected?.permanent ?? false;
  useEffect(() => {
    if (!rejectedReason) return;
    setRejectedNotice(rejectedReason);
    if (rejectedPermanent) void removeCouponAction();
  }, [rejectedReason, rejectedPermanent]);

  const apply = () =>
    startTransition(async () => {
      setError(null);
      const res = await applyCouponAction(code);
      if (!res.ok) {
        setError(res.error ?? "No se pudo aplicar el cupón.");
        return;
      }
      setCode("");
      router.refresh();
    });

  const remove = () =>
    startTransition(async () => {
      await removeCouponAction();
      router.refresh();
    });

  if (applied) {
    return (
      <div className="flex items-center justify-between gap-2 border border-line px-3 py-2 text-sm">
        <span className="text-ink">
          Cupón <strong>{applied}</strong> aplicado
        </span>
        <button
          type="button"
          onClick={remove}
          disabled={pending}
          className="tracking-caps-sm min-h-11 text-xs uppercase text-ink-3 outline-none transition-colors duration-ui ease-ui hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          Quitar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-2">
        <TextInput
          id="coupon-code"
          label="Cupón"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          className="uppercase"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={apply}
          disabled={pending || !code.trim()}
          className="min-h-11"
        >
          Aplicar
        </Button>
      </div>
      {(error ?? rejectedNotice) && (
        <p className="text-sm text-ink-3">{error ?? rejectedNotice}</p>
      )}
    </div>
  );
}
