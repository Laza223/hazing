"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/text-input";
import { updatePasswordAction } from "./actions";

/**
 * Form de cambio de contraseña tras el link de recuperación
 * (`/auth/confirm?type=recovery&next=/cuenta/nueva-contrasena`): la sesión ya
 * está activa por el `verifyOtp` del Route Handler; el cambio lo hace
 * `updatePasswordAction` en el server.
 */
export function NuevaContrasenaForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password") ?? "");
    try {
      const r = await updatePasswordAction(password);
      if (!r.ok) {
        setError(r.error ?? "No se pudo actualizar la contraseña.");
        return;
      }
      router.push("/cuenta");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-sm space-y-4">
      <TextInput
        id="password"
        name="password"
        label="Nueva contraseña"
        type="password"
        autoComplete="new-password"
        minLength={8}
        required
      />
      {error && (
        <p role="alert" className="text-sm text-ink">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        Guardar contraseña
      </Button>
    </form>
  );
}
