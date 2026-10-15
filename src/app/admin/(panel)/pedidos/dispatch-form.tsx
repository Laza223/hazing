"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { TextInput } from "@/components/ui/text-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CARRIERS } from "@/lib/admin/orders/carriers";
import { dispatchOrderAction, resendDispatchEmailAction } from "./actions";

/** Carga manual del despacho: la dueña elige la empresa y pega el código; el link sale solo. */
export function DispatchForm({
  orderId,
  alreadyShipped,
  initial,
}: {
  orderId: string;
  alreadyShipped: boolean;
  initial: { carrier: string; trackingNumber: string };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Un despacho viejo cargado a mano ("Via cargo") no coincide: se vuelve a elegir.
  const [carrier, setCarrier] = useState(
    CARRIERS.some((c) => c.name === initial.carrier) ? initial.carrier : "",
  );
  const [trackingNumber, setTrackingNumber] = useState(initial.trackingNumber);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [emailFailed, setEmailFailed] = useState(false);
  const [resent, setResent] = useState(false);
  const trackingUrl = CARRIERS.find((c) => c.name === carrier)?.trackingUrl;

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
      <div className="flex flex-col gap-1">
        <Label htmlFor="dispatch-carrier">Empresa</Label>
        <Select value={carrier} onValueChange={setCarrier}>
          <SelectTrigger id="dispatch-carrier">
            <SelectValue placeholder="Elegí la empresa" />
          </SelectTrigger>
          <SelectContent>
            {CARRIERS.map((c) => (
              <SelectItem key={c.name} value={c.name}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {trackingUrl ? (
          <p className="text-xs text-ink-3">
            Link de seguimiento para la clienta:{" "}
            <a
              href={trackingUrl}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              {trackingUrl}
            </a>
          </p>
        ) : null}
      </div>
      <TextInput
        id="dispatch-tracking"
        label="Código de seguimiento"
        value={trackingNumber}
        onChange={(e) => setTrackingNumber(e.target.value)}
        required
      />
      <p className="text-xs text-ink-3">
        {alreadyShipped
          ? "Corregir los datos no reenvía el mail, salvo que cambies el código."
          : "Al guardar, el pedido pasa a Enviado y le mandamos a la clienta el código y el link por mail."}
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
      <Button type="submit" size="sm" disabled={pending || !carrier}>
        {pending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : null}
        {alreadyShipped ? "Guardar cambios" : "Marcar despachado"}
      </Button>
    </form>
  );
}
