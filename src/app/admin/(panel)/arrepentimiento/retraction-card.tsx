"use client";

import { useTransition } from "react";
import type { RetractionStatus } from "@prisma/client";
import {
  FileText,
  Mail,
  Phone,
  MessageCircle,
  CalendarDays,
  ShoppingBag,
  Check,
  X,
  RotateCcw,
  Loader2,
} from "lucide-react";

import { formatRetractionTicket } from "@/lib/legal/retraction/ticket";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { updateRetractionStatusAction } from "./actions";

export interface RetractionItemView {
  id: string;
  seq: number;
  orderNumber: string | null;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  reason: string | null;
  status: RetractionStatus;
  createdAt: Date;
}

const STATUS_LABEL: Record<RetractionStatus, string> = {
  pending: "Pendiente",
  processed: "Procesada",
  rejected: "Rechazada",
};

export function RetractionCard({ item }: { item: RetractionItemView }) {
  const [pending, startTransition] = useTransition();
  const ticket = formatRetractionTicket(item.seq);

  const cleanPhone = item.contactPhone?.replace(/\D/g, "");
  const waUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
        `Hola ${item.contactName}, te escribimos de Hazing por tu solicitud de arrepentimiento (${ticket}).`,
      )}`
    : null;

  function setStatus(next: RetractionStatus) {
    startTransition(async () => {
      await updateRetractionStatusAction({ id: item.id, status: next });
    });
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-control border border-line">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
        <div className="flex items-center gap-2.5">
          <FileText className="size-4 shrink-0 text-ink-3" aria-hidden />
          <div>
            <span className="font-mono text-sm font-medium tracking-wide text-ink">
              {ticket}
            </span>
            <div className="flex items-center gap-1.5 text-[11px] text-ink-4">
              <CalendarDays className="size-3" aria-hidden />
              <span>{item.createdAt.toLocaleDateString("es-AR")}</span>
              <span>·</span>
              <span>
                {item.createdAt.toLocaleTimeString("es-AR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
        </div>
        <Badge>{STATUS_LABEL[item.status]}</Badge>
      </div>

      <div className="flex-1 space-y-4 p-5">
        <div>
          <p className="tracking-caps-sm text-xs uppercase text-ink-4">
            Clienta
          </p>
          <p className="text-sm font-medium text-ink">{item.contactName}</p>
        </div>

        <div className="grid grid-cols-1 gap-2.5 text-xs sm:grid-cols-2">
          <a
            href={`mailto:${item.contactEmail}?subject=${encodeURIComponent(`Hazing — Solicitud ${ticket}`)}`}
            className="flex items-center gap-2 truncate rounded-control border border-line px-3 py-2 text-ink-2 outline-none transition-colors duration-ui ease-ui focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            <Mail className="size-3.5 shrink-0 text-ink-4" aria-hidden />
            <span className="truncate">{item.contactEmail}</span>
          </a>

          {item.contactPhone ? (
            <div className="flex items-center gap-1">
              <a
                href={`tel:${item.contactPhone}`}
                className="flex flex-1 items-center gap-2 truncate rounded-control border border-line px-3 py-2 text-ink-2 outline-none transition-colors duration-ui ease-ui focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                <Phone className="size-3.5 shrink-0 text-ink-4" aria-hidden />
                <span className="truncate">{item.contactPhone}</span>
              </a>
              {waUrl ? (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noreferrer"
                  title="Escribir por WhatsApp"
                  className="grid size-9 shrink-0 place-items-center rounded-control border border-line text-ink-3 outline-none transition-colors duration-ui ease-ui focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                >
                  <MessageCircle className="size-4" aria-hidden />
                </a>
              ) : null}
            </div>
          ) : (
            <span className="flex items-center px-3 py-2 text-ink-4">
              Sin teléfono
            </span>
          )}
        </div>

        {item.orderNumber ? (
          <div className="flex items-center gap-2 text-xs text-ink-3">
            <span>Nº de pedido:</span>
            <span className="inline-flex items-center gap-1 rounded-control border border-line px-2 py-0.5 font-mono font-medium text-ink">
              <ShoppingBag className="size-3" aria-hidden />
              {item.orderNumber}
            </span>
          </div>
        ) : null}

        {item.reason ? (
          <div className="rounded-control border border-line p-3 text-xs">
            <p className="mb-1 text-ink-4">Motivo manifestado:</p>
            <p className="whitespace-pre-wrap leading-relaxed text-ink-2">
              {item.reason}
            </p>
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-line px-5 py-3 text-xs">
        <span className="text-ink-4">
          {pending ? "Actualizando estado…" : "Cambiar estado:"}
        </span>

        <div className="flex items-center gap-2">
          {item.status !== "processed" ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => setStatus("processed")}
              className="gap-1"
            >
              {pending ? (
                <Loader2 className="size-3 animate-spin" aria-hidden />
              ) : (
                <Check className="size-3" aria-hidden />
              )}
              Procesada
            </Button>
          ) : null}

          {item.status !== "rejected" ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => setStatus("rejected")}
              className="gap-1"
            >
              {pending ? (
                <Loader2 className="size-3 animate-spin" aria-hidden />
              ) : (
                <X className="size-3" aria-hidden />
              )}
              Rechazar
            </Button>
          ) : null}

          {item.status !== "pending" ? (
            <Button
              type="button"
              size="sm"
              variant="text"
              disabled={pending}
              onClick={() => setStatus("pending")}
              className="gap-1"
            >
              <RotateCcw className="size-3" aria-hidden />
              Pendiente
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
