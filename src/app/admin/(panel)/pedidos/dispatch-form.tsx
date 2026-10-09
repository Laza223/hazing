"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/text-input";
import { dispatchOrderAction, resendDispatchEmailAction } from "./actions";

/** Carga manual del despacho: empresa, código y link libres (la dueña elige el courier). */
export function DispatchForm({
  orderId,
  alreadyShipped,
  initial,
}: {
  orderId: string;
  alreadyShipped: boolean;
  initial: { carrier: string; trackingNumber: string; trackingUrl: string };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [carrier, setCarrier] = useState(initial.carrier);
  const [trackingNumber, setTrackingNumber] = useState(initial.trackingNumber);
  const [trackingUrl, setTrackingUrl] = useState(initial.trackingUrl);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [emailFailed, setEmailFailed] = useState(false);
  const [resent, setResent] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setEmailFailed(false);
    setResent(false);
    startTransition(async () => {
      const r = await dispatchOrderAction(orderId, {
        carrier,
        trackingNumber,
        trackingUrl,
      });
      if (!r.ok) setError(r.error ?? "No se pudo marcar como despachado.");
      else {
        setSaved(true);
        setEmailFailed(r.emailSent === false);
        router.refresh();
      }
    });
  };

  const resend = () => {
    setError(null);
    startTransition(async () => {
      const r = await resendDispatchEmailAction(orderId);
      if (!r.ok) setError(r.error ?? "No se pudo reenviar el mail.");
      else {
        setEmailFailed(false);
        setResent(true);
      }
    });
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <TextInput
        id="dispatch-carrier"
        label="Empresa"
        value={carrier}
        onChange={(e) => setCarrier(e.target.value)}
        placeholder="Via Cargo"
        required
      />
      <TextInput
        id="dispatch-tracking"
        label="Código de seguimiento"
        value={trackingNumber}
        onChange={(e) => setTrackingNumber(e.target.value)}
        required
      />
      <TextInput
        id="dispatch-url"
        label="Link de seguimiento (opcional)"
        type="url"
        value={trackingUrl}
        onChange={(e) => setTrackingUrl(e.target.value)}
        placeholder="https://"
      />
      <p className="text-xs text-ink-3">
        {alreadyShipped
          ? "Corregir los datos no reenvía el mail, salvo que cambies el código."
          : "Al guardar, el pedido pasa a Enviado y le avisamos a la clienta por mail."}
      </p>
      {error ? (
        <p role="alert" className="flex items-center gap-1.5 text-sm text-ink">
          <AlertCircle className="size-4 shrink-0" aria-hidden />
          {error}
        </p>
      ) : null}
      {saved ? (
        <p role="status" className="text-sm text-ink-3">
          {emailFailed
            ? "Despacho guardado, pero el mail a la clienta no salió."
            : resent
              ? "Despacho guardado. Mail reenviado a la clienta."
              : "Despacho guardado."}
        </p>
      ) : null}
      {resent && !saved ? (
        <p role="status" className="text-sm text-ink-3">
          Mail reenviado a la clienta.
        </p>
      ) : null}
      {emailFailed ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={resend}
          disabled={pending}
        >
          Reenviar mail de despacho
        </Button>
      ) : null}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : null}
        {alreadyShipped ? "Guardar cambios" : "Marcar despachado"}
      </Button>
    </form>
  );
}
