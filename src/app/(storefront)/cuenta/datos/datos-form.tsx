"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/text-input";
import { updateProfileAction } from "./actions";

export function DatosForm({
  initial,
}: {
  initial: { name: string; phone: string; email: string };
}) {
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaved(false);
    setError(null);
    setPending(true);
    const fd = new FormData(e.currentTarget);
    const res = await updateProfileAction({
      name: String(fd.get("name") ?? ""),
      phone: String(fd.get("phone") ?? ""),
    });
    setPending(false);
    if (res.ok) setSaved(true);
    else setError(res.error ?? "Error");
  }

  return (
    <form onSubmit={onSubmit} className="max-w-sm space-y-4">
      <TextInput
        id="name"
        name="name"
        label="Nombre"
        defaultValue={initial.name}
        required
      />
      <TextInput
        id="phone"
        name="phone"
        label="Teléfono"
        type="tel"
        inputMode="tel"
        defaultValue={initial.phone}
      />
      <TextInput
        id="email"
        label="Email"
        value={initial.email}
        readOnly
        disabled
      />
      {error && (
        <p role="alert" className="text-sm text-ink">
          {error}
        </p>
      )}
      {saved && <p className="text-sm text-ink-2">Guardado.</p>}
      <Button type="submit" disabled={pending}>
        Guardar
      </Button>
    </form>
  );
}
