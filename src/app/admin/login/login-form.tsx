"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/text-input";
import { signInAction } from "./actions";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await signInAction(email, password);
      if (!res.ok) {
        setError(res.error ?? "No pudimos iniciar sesión.");
        return;
      }
      router.replace("/admin");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full flex-col gap-4" noValidate>
      <TextInput
        id="email"
        label="Email"
        type="email"
        autoComplete="username"
        placeholder="vos@hazing.com.ar"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <TextInput
        id="password"
        label="Contraseña"
        type="password"
        autoComplete="current-password"
        placeholder="••••••••"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      {error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-control border border-line px-3 py-2.5 text-sm text-ink"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </p>
      )}
      <Button type="submit" disabled={pending} className="mt-1 w-full gap-2">
        {pending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : null}
        {pending ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  );
}
