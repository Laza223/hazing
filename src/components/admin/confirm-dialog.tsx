"use client";

import * as React from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * ConfirmDialog — API: `trigger` (el elemento que abre el diálogo, ej. un
 * botón "Cancelar pedido"), `title`, `description`, `confirmLabel`/
 * `cancelLabel` (opcionales), `onConfirm` (puede ser async), `pending`
 * (deshabilita los botones mientras corre la acción). Reusar para toda
 * confirmación de acción peligrosa (borrar, cancelar, rechazar) en 7.2/7.3.
 */
export interface ConfirmDialogProps {
  trigger: React.ReactNode;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  pending?: boolean;
}

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = "Sí, confirmar",
  cancelLabel = "No, volver",
  onConfirm,
  pending = false,
}: ConfirmDialogProps) {
  const [open, setOpen] = React.useState(false);

  async function handleConfirm() {
    await onConfirm();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={pending}>
              {cancelLabel}
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleConfirm} disabled={pending}>
            {pending ? "Procesando…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
