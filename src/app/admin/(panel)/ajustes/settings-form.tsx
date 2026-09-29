"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/text-input";
import { updateSettingsAction } from "./actions";

interface SettingsFormProps {
  initialSettings: {
    storeName: string;
    freeShippingThreshold: number | null;
    shippingPrice: number | null;
    originPostalCode: string;
    whatsappNumber: string | null;
    instagramUrl: string | null;
    tiktokUrl: string | null;
  };
}

export function SettingsForm({ initialSettings }: SettingsFormProps) {
  const [pending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSuccess(false);
    setError(null);
    const fd = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await updateSettingsAction(fd);
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 4000);
      } else {
        setError(res.error ?? "Ocurrió un error al guardar los ajustes.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {success && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-control border border-line px-4 py-3 text-sm text-ink"
        >
          <CheckCircle2 className="size-4 shrink-0" aria-hidden />
          Ajustes guardados correctamente.
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-control border border-line px-4 py-3 text-sm text-ink"
        >
          <AlertCircle className="size-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}

      <div className="space-y-5 rounded-control border border-line p-6">
        <div>
          <h2 className="text-base font-medium text-ink">Identidad y envíos</h2>
          <p className="text-xs text-ink-3">
            Datos generales de la tienda y reglas de despacho nacional.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <TextInput
            id="storeName"
            name="storeName"
            label="Nombre de la tienda"
            defaultValue={initialSettings.storeName}
            required
            placeholder="Hazing"
          />
          <div className="flex flex-col gap-1">
            <TextInput
              id="freeShippingThreshold"
              name="freeShippingThreshold"
              label="Monto mínimo para envío gratis (ARS)"
              type="number"
              min="0"
              step="500"
              defaultValue={initialSettings.freeShippingThreshold ?? ""}
              placeholder="Vacío = sin envío gratis"
            />
            <p className="text-[11px] text-ink-4">
              Dejalo vacío si por ahora no vas a ofrecer envío gratis.
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <TextInput
              id="shippingPrice"
              name="shippingPrice"
              label="Costo de envío a todo el país (ARS)"
              type="number"
              min="0"
              step="100"
              defaultValue={initialSettings.shippingPrice ?? ""}
              placeholder="Ej. 6500"
            />
            <p className="text-[11px] text-ink-4">
              Un solo precio para cualquier código postal. Si lo dejás vacío, la
              tienda no puede cobrar envíos y las clientas no pueden pagar.
            </p>
          </div>
          <TextInput
            id="originPostalCode"
            name="originPostalCode"
            label="Código postal de origen (despacho)"
            defaultValue={initialSettings.originPostalCode}
            required
            maxLength={8}
            placeholder="6700"
          />
        </div>
      </div>

      <div className="space-y-5 rounded-control border border-line p-6">
        <div>
          <h2 className="text-base font-medium text-ink">
            Contacto y redes sociales
          </h2>
          <p className="text-xs text-ink-3">
            Canales de comunicación oficiales donde tus clientas pueden
            escribirte.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <TextInput
            id="whatsappNumber"
            name="whatsappNumber"
            label="Número de WhatsApp"
            defaultValue={initialSettings.whatsappNumber ?? ""}
            placeholder="5492323582495"
          />
          <TextInput
            id="instagramUrl"
            name="instagramUrl"
            label="Enlace de Instagram"
            type="url"
            defaultValue={initialSettings.instagramUrl ?? ""}
            placeholder="https://www.instagram.com/hazing"
          />
          <div className="md:col-span-2">
            <TextInput
              id="tiktokUrl"
              name="tiktokUrl"
              label="Enlace de TikTok (opcional)"
              type="url"
              defaultValue={initialSettings.tiktokUrl ?? ""}
              placeholder="https://www.tiktok.com/@hazing"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending} className="gap-2">
          {pending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : null}
          {pending ? "Guardando ajustes…" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}
