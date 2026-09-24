"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { TextInput } from "@/components/ui/text-input";
import { Button } from "@/components/ui/button";
import {
  applyCouponAction,
  removeCouponAction,
} from "@/app/(storefront)/actions";

export function CouponForm({ applied }: { applied: string | null }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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
      {error && <p className="text-sm text-ink-3">{error}</p>}
    </div>
  );
}
