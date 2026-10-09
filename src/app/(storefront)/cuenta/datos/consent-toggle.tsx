"use client";

import { useState } from "react";
import { updateMarketingConsentAction } from "./actions";

export function ConsentToggle({ initial }: { initial: boolean }) {
  const [checked, setChecked] = useState(initial);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.checked;
    setPending(true);
    setMessage(null);
    try {
      const res = await updateMarketingConsentAction(next);
      if (res.ok) {
        setChecked(next);
        setMessage("Guardado.");
      } else setMessage(res.error ?? "No pudimos guardar el cambio.");
    } catch {
      setMessage("No pudimos guardar el cambio. Probá de nuevo.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-8 max-w-sm space-y-2 border-t border-line pt-6">
      <label className="flex items-start gap-2 text-sm text-ink-2">
        <input
          type="checkbox"
          checked={checked}
          disabled={pending}
          onChange={onChange}
          className="mt-1 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        />
        Quiero recibir novedades y recordatorios de mi carrito por email.
      </label>
      {message && (
        <p role="status" className="text-sm text-ink-2">
          {message}
        </p>
      )}
    </div>
  );
}
