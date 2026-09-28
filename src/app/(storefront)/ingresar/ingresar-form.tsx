"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/text-input";
import {
  signInAction,
  signUpAction,
  requestPasswordResetAction,
} from "./actions";

type Mode = "in" | "up" | "recover";

export function IngresarForm({
  initialError = null,
  next = "/cuenta",
}: {
  initialError?: string | null;
  next?: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("in");
  const [error, setError] = useState<string | null>(initialError);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setInfo(null);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setPending(true);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "");
    try {
      if (mode === "in") {
        const password = String(fd.get("password") ?? "");
        const res = await signInAction({ email, password });
        if (!res.ok) {
          setError(res.error ?? "Error");
          return;
        }
        router.push(next);
        router.refresh();
      } else if (mode === "up") {
        const password = String(fd.get("password") ?? "");
        const res = await signUpAction({
          email,
          password,
          name: String(fd.get("name") ?? ""),
          marketingConsent: fd.get("consent") === "on",
        });
        if (!res.ok) {
          setError(res.error ?? "Error");
          return;
        }
        if (res.needsConfirmation)
          setInfo("¡Listo! Revisá tu correo para confirmar tu cuenta.");
        else {
          router.push(next);
          router.refresh();
        }
      } else {
        await requestPasswordResetAction(email);
        setInfo(
          "Si el email está registrado, te mandamos un link para recuperar tu contraseña.",
        );
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm space-y-6">
      {mode !== "recover" && (
        <div className="grid grid-cols-2 border border-line text-sm">
          <button
            type="button"
            onClick={() => switchMode("in")}
            className={
              mode === "in"
                ? "min-h-11 bg-ink py-2 font-medium text-paper"
                : "min-h-11 py-2 text-ink-2 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            }
          >
            Ingresar
          </button>
          <button
            type="button"
            onClick={() => switchMode("up")}
            className={
              mode === "up"
                ? "min-h-11 bg-ink py-2 font-medium text-paper"
                : "min-h-11 py-2 text-ink-2 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            }
          >
            Crear cuenta
          </button>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        {mode === "up" && (
          <TextInput
            id="name"
            name="name"
            label="Nombre"
            autoComplete="name"
            required
          />
        )}
        <TextInput
          id="email"
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
        />
        {mode !== "recover" && (
          <TextInput
            id="password"
            name="password"
            label="Contraseña"
            type="password"
            autoComplete={mode === "in" ? "current-password" : "new-password"}
            minLength={8}
            required
          />
        )}
        {mode === "up" && (
          <label className="flex items-start gap-2 text-sm text-ink-2">
            <input type="checkbox" name="consent" className="mt-1" />
            Quiero recibir novedades y recordatorios de mi carrito.
          </label>
        )}
        {mode === "in" && (
          <button
            type="button"
            onClick={() => switchMode("recover")}
            className="text-xs text-ink-2 underline underline-offset-4 outline-none hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            Olvidé mi contraseña
          </button>
        )}
        {mode === "recover" && (
          <button
            type="button"
            onClick={() => switchMode("in")}
            className="text-xs text-ink-2 underline underline-offset-4 outline-none hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            ← Volver a ingresar
          </button>
        )}
        {error && (
          <p role="alert" className="text-sm text-ink">
            {error}
          </p>
        )}
        {info && <p className="text-sm text-ink-2">{info}</p>}
        <Button type="submit" disabled={pending} className="w-full">
          {mode === "in"
            ? "Ingresar"
            : mode === "up"
              ? "Crear cuenta"
              : "Enviar link"}
        </Button>
      </form>
    </div>
  );
}
