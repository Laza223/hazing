"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import gsap from "gsap";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Swatch } from "@/components/ui/swatch";
import { maskReveal } from "@/lib/motion/primitives";
import { useReducedMotion } from "@/lib/motion/use-reduced-motion";

export interface ColorOption {
  name: string;
  hex: string | null;
}

export interface FilterPanelProps {
  sizeOptions: string[];
  colorOptions: ColorOption[];
  className?: string;
}

interface SearchParamsLike {
  get(key: string): string | null;
  getAll(key: string): string[];
}

function countActiveFilters(params: SearchParamsLike): number {
  let count = 0;
  if (params.get("min")) count += 1;
  if (params.get("max")) count += 1;
  if (params.get("oferta") === "1") count += 1;
  if (params.get("disponible") === "1") count += 1;
  count += params.getAll("talle").length;
  count += params.getAll("color").length;
  return count;
}

function toggleValue(list: string[], value: string): string[] {
  return list.includes(value)
    ? list.filter((v) => v !== value)
    : [...list, value];
}

/**
 * FilterPanel — panel lateral con `@radix-ui/react-dialog` (foco atrapado),
 * entra desde la derecha en 450 ms `ease-out-expo`, se separa con `line`, sin
 * sombra, pantalla completa en mobile (docs/spec/06-storefront.md §3.3).
 * Aplicar navega a la URL con los params — el estado vive ahí, no en cliente.
 */
export function FilterPanel({
  sizeOptions,
  colorOptions,
  className,
}: FilterPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const reducedMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [onSale, setOnSale] = useState(false);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sizes, setSizes] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);

  const activeCount = useMemo(
    () => countActiveFilters(searchParams),
    [searchParams],
  );

  // Sincroniza el formulario con la URL cada vez que se abre el panel.
  useEffect(() => {
    if (!open) return;
    setMin(searchParams.get("min") ?? "");
    setMax(searchParams.get("max") ?? "");
    setOnSale(searchParams.get("oferta") === "1");
    setInStockOnly(searchParams.get("disponible") === "1");
    setSizes(searchParams.getAll("talle"));
    setColors(searchParams.getAll("color"));
  }, [open, searchParams]);

  useEffect(() => {
    const node = contentRef.current;
    if (!open || !node) return;
    if (reducedMotion) {
      gsap.set(node, { clearProps: "all" });
      return;
    }
    const tween = maskReveal(node, { direction: "right" });
    tween.play();
    return () => {
      tween.kill();
    };
  }, [open, reducedMotion]);

  function apply() {
    const next = new URLSearchParams(searchParams.toString());
    if (min) next.set("min", min);
    else next.delete("min");
    if (max) next.set("max", max);
    else next.delete("max");
    if (onSale) next.set("oferta", "1");
    else next.delete("oferta");
    if (inStockOnly) next.set("disponible", "1");
    else next.delete("disponible");
    next.delete("talle");
    sizes.forEach((size) => next.append("talle", size));
    next.delete("color");
    colors.forEach((color) => next.append("color", color));
    next.delete("page");
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    setOpen(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className={cn(
            "tracking-caps-sm inline-flex min-h-11 min-w-11 items-center justify-center text-xs uppercase text-ink outline-none transition-colors duration-ui ease-ui hover:text-ink-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
            className,
          )}
        >
          Filtrar{activeCount > 0 ? ` (${activeCount})` : ""}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/30" />
        <Dialog.Content
          ref={contentRef}
          className="fixed inset-y-0 right-0 z-50 flex w-full flex-col overflow-y-auto border-l border-line bg-paper px-6 py-8 sm:max-w-sm"
        >
          <div className="flex items-center justify-between">
            <Dialog.Title className="font-display text-lg text-ink">
              Filtros
            </Dialog.Title>
            <Dialog.Close className="tracking-caps-sm inline-flex min-h-11 items-center text-xs uppercase text-ink outline-none transition-colors duration-ui ease-ui focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">
              Cerrar
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">
            Filtrar los productos del catálogo por precio, talle, color, oferta
            y disponibilidad.
          </Dialog.Description>

          <div className="mt-6 flex-1 space-y-8">
            <fieldset className="space-y-3 border-t border-line pt-6">
              <legend className="tracking-caps-sm text-xs uppercase text-ink-2">
                Precio (ARS)
              </legend>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  placeholder="Mín"
                  value={min}
                  onChange={(e) => setMin(e.target.value)}
                  aria-label="Precio mínimo"
                  className="h-11 w-full border border-line px-3 text-sm text-ink outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                />
                <span aria-hidden="true" className="text-ink-3">
                  —
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  placeholder="Máx"
                  value={max}
                  onChange={(e) => setMax(e.target.value)}
                  aria-label="Precio máximo"
                  className="h-11 w-full border border-line px-3 text-sm text-ink outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                />
              </div>
            </fieldset>

            {sizeOptions.length > 0 && (
              <fieldset className="space-y-3 border-t border-line pt-6">
                <legend className="tracking-caps-sm text-xs uppercase text-ink-2">
                  Talle
                </legend>
                <div className="flex flex-wrap gap-2">
                  {sizeOptions.map((size) => {
                    const selected = sizes.includes(size);
                    return (
                      <button
                        key={size}
                        type="button"
                        aria-pressed={selected}
                        onClick={() =>
                          setSizes((prev) => toggleValue(prev, size))
                        }
                        className={cn(
                          "h-11 min-w-11 rounded-control border border-line px-3 text-sm text-ink outline-none transition-colors duration-ui ease-ui focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
                          selected && "border-ink bg-ink text-paper",
                        )}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            )}

            {colorOptions.length > 0 && (
              <fieldset className="space-y-3 border-t border-line pt-6">
                <legend className="tracking-caps-sm text-xs uppercase text-ink-2">
                  Color
                </legend>
                {/* Columnas de ≥44px y etiqueta a 12px: el área táctil del swatch
                    (44×44, ver ui/swatch.tsx) no se pisa con la del vecino ni con
                    la etiqueta de abajo (hallazgo de UX, 2026-09-24). */}
                <div className="flex flex-wrap gap-x-1 gap-y-4">
                  {colorOptions.map((color) => (
                    <div
                      key={color.name}
                      className="flex min-w-11 flex-col items-center gap-3"
                    >
                      <Swatch
                        hex={color.hex ?? "#D4D4D4"}
                        label={color.name}
                        selected={colors.includes(color.name)}
                        onClick={() =>
                          setColors((prev) => toggleValue(prev, color.name))
                        }
                      />
                      <span className="text-[10px] text-ink-3">
                        {color.name}
                      </span>
                    </div>
                  ))}
                </div>
              </fieldset>
            )}

            <fieldset className="space-y-3 border-t border-line pt-6">
              <legend className="sr-only">Disponibilidad y ofertas</legend>
              <label className="flex min-h-11 items-center justify-between text-sm text-ink">
                <span>En oferta</span>
                <input
                  type="checkbox"
                  checked={onSale}
                  onChange={(e) => setOnSale(e.target.checked)}
                  className="h-5 w-5 accent-ink"
                />
              </label>
              <label className="flex min-h-11 items-center justify-between text-sm text-ink">
                <span>Solo disponibles</span>
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                  className="h-5 w-5 accent-ink"
                />
              </label>
            </fieldset>
          </div>

          <div className="mt-8 border-t border-line pt-6">
            <Button onClick={apply} className="w-full">
              Aplicar filtros
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
