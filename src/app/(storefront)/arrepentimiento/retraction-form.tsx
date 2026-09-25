"use client";

import { useEffect, useRef, useState } from "react";
import * as LabelPrimitive from "@radix-ui/react-label";

import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/text-input";
import { requestRetractionAction } from "./actions";

/**
 * RetractionForm — formulario del Botón de Arrepentimiento (art. 34 Ley
 * 24.240, Res. 424/2020). Error del servidor asociado al formulario vía
 * `aria-describedby`; el estado de éxito muestra la constancia y recibe
 * foco para que lectores de pantalla lo anuncien.
 */
export function RetractionForm() {
  const [error, setError] = useState<string | null>(null);
  const [ticket, setTicket] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const successRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ticket) successRef.current?.focus();
  }, [ticket]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const fd = new FormData(e.currentTarget);
    const res = await requestRetractionAction({
      contactName: String(fd.get("contactName") ?? ""),
      contactEmail: String(fd.get("contactEmail") ?? ""),
      contactPhone: String(fd.get("contactPhone") ?? ""),
      orderNumber: String(fd.get("orderNumber") ?? ""),
      reason: String(fd.get("reason") ?? ""),
      website: String(fd.get("website") ?? ""),
    });
    setPending(false);
    if (res.ok) {
      setTicket(res.ticket ?? "—");
      setDate(res.date ?? null);
    } else setError(res.error ?? "No se pudo procesar la solicitud.");
  }

  if (ticket) {
    return (
      <div
        ref={successRef}
        tabIndex={-1}
        role="status"
        className="border border-line p-4 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        <p className="font-medium text-ink">
          Recibimos tu solicitud de arrepentimiento.
        </p>
        <p className="mt-1 text-sm text-ink-2">
          Tu número de constancia es{" "}
          <strong className="text-ink">{ticket}</strong>
          {date ? <> del {date}</> : null}. Te enviamos una copia por email y te
          vamos a contactar para coordinar la devolución y el reintegro.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      aria-describedby={error ? "retraction-form-error" : undefined}
      className="space-y-4 border border-line p-4"
    >
      <TextInput
        id="contactName"
        name="contactName"
        label="Nombre y apellido"
        required
        minLength={2}
        maxLength={80}
        autoComplete="name"
      />
      <TextInput
        id="contactEmail"
        name="contactEmail"
        label="Email"
        type="email"
        required
        autoComplete="email"
        inputMode="email"
      />
      <TextInput
        id="contactPhone"
        name="contactPhone"
        label="Teléfono (opcional)"
        type="tel"
        maxLength={40}
        autoComplete="tel"
        inputMode="tel"
      />
      <TextInput
        id="orderNumber"
        name="orderNumber"
        label="Número de pedido (opcional)"
        maxLength={40}
        placeholder="HZG-000123"
      />

      <div className="flex flex-col gap-1">
        <LabelPrimitive.Root
          htmlFor="reason"
          className="tracking-caps-sm text-xs font-medium uppercase text-ink-2"
        >
          Motivo (opcional)
        </LabelPrimitive.Root>
        <textarea
          id="reason"
          name="reason"
          maxLength={1000}
          rows={3}
          className="rounded-control border border-line bg-paper px-3 py-2 text-base text-ink outline-none transition-colors duration-ui ease-ui placeholder:text-ink-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        />
      </div>

      {/* Honeypot anti-spam: oculto para humanos, los bots tienden a completarlo. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="hidden"
      />

      {error && (
        <p id="retraction-form-error" role="alert" className="text-sm text-ink">
          {error}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Enviando…" : "Enviar solicitud"}
      </Button>
    </form>
  );
}
