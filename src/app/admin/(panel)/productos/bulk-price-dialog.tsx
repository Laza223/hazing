"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatARS } from "@/lib/money";
import {
  applyPriceIncreaseAction,
  previewPriceIncreaseAction,
} from "@/app/admin/(panel)/productos/actions";

const fieldClass =
  "h-11 w-full rounded-control border border-line bg-paper px-3 text-base text-ink outline-none transition-colors duration-ui ease-ui focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink md:text-sm";

interface Summary {
  percent: number;
  categoryId: string | null;
  categoryName: string | null;
  products: number;
  example: { from: number; to: number } | null;
}

/** Sube un % todos los precios (o los de una categoría) en dos pasos: valores → resumen → aplicar. */
export function BulkPriceDialog({
  categories,
}: {
  categories: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [percentText, setPercentText] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setPercentText("");
    setCategoryId("");
    setSummary(null);
    setError(null);
    setDone(null);
  }

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) reset();
  }

  function onPreview(e: React.FormEvent) {
    e.preventDefault();
    const percent = Number(percentText.replace(",", "."));
    startTransition(async () => {
      setError(null);
      const r = await previewPriceIncreaseAction(percent, categoryId || null);
      if (!r.ok) return setError(r.error ?? "No se pudo calcular la suba.");
      setSummary({
        percent,
        categoryId: categoryId || null,
        categoryName: categories.find((c) => c.id === categoryId)?.name ?? null,
        products: r.products ?? 0,
        example: r.example ?? null,
      });
    });
  }

  function onApply() {
    if (!summary) return;
    startTransition(async () => {
      setError(null);
      const r = await applyPriceIncreaseAction(
        summary.percent,
        summary.categoryId,
      );
      if (!r.ok) return setError(r.error ?? "No se pudo subir los precios.");
      setDone(r.products ?? 0);
      router.refresh();
    });
  }

  const errorNode = error && (
    <p role="alert" className="flex items-center gap-1.5 text-xs text-ink-3">
      <AlertCircle className="size-3.5 shrink-0" aria-hidden />
      {error}
    </p>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          <TrendingUp className="size-4" aria-hidden /> Subir precios
        </Button>
      </DialogTrigger>
      <DialogContent>
        {done !== null ? (
          <>
            <DialogHeader>
              <DialogTitle>Precios actualizados</DialogTitle>
              <DialogDescription>
                Se subieron los precios de {done}{" "}
                {done === 1 ? "producto" : "productos"}.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button">Listo</Button>
              </DialogClose>
            </DialogFooter>
          </>
        ) : summary ? (
          <>
            <DialogHeader>
              <DialogTitle>Confirmar suba de precios</DialogTitle>
              <DialogDescription>
                Vas a subir {summary.percent}% los precios de {summary.products}{" "}
                {summary.products === 1 ? "producto" : "productos"}
                {summary.categoryName
                  ? ` de ${summary.categoryName} (y sus subcategorías)`
                  : " (todo el catálogo)"}
                . Incluye precios por variante y precios tachados. Nunca baja un
                precio. Se redondea a $100. No se puede deshacer.
              </DialogDescription>
            </DialogHeader>
            {summary.example && (
              <p className="mb-4 text-sm text-ink-2">
                Ejemplo: {formatARS(summary.example.from)} →{" "}
                {formatARS(summary.example.to)}
              </p>
            )}
            {errorNode}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => setSummary(null)}
              >
                Volver
              </Button>
              <Button
                type="button"
                onClick={onApply}
                disabled={pending || summary.products === 0}
              >
                {pending ? "Procesando…" : "Sí, subir precios"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={onPreview} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Subir precios</DialogTitle>
              <DialogDescription>
                Elegí cuánto querés subir. Después ves un resumen antes de
                confirmar.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-1.5">
              <label htmlFor="bulk-percent" className="text-sm text-ink">
                Porcentaje a subir
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="bulk-percent"
                  inputMode="decimal"
                  autoFocus
                  required
                  value={percentText}
                  onChange={(e) => setPercentText(e.target.value)}
                  placeholder="Ej: 20"
                  className={fieldClass}
                />
                <span className="text-sm text-ink-3">%</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="bulk-category" className="text-sm text-ink">
                Productos
              </label>
              <select
                id="bulk-category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className={fieldClass}
              >
                <option value="">Todos los productos</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            {errorNode}
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={pending}>
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit" disabled={pending}>
                {pending ? "Calculando…" : "Ver resumen"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
