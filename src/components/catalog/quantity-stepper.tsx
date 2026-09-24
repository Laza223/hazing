"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";

import { cn } from "@/lib/utils";

export interface QuantityStepperProps {
  max?: number;
  initial?: number;
  onChange?: (qty: number) => void;
  className?: string;
}

/**
 * QuantityStepper — control +/− de cantidad (docs/spec/06-storefront.md
 * §3.6, líneas del carrito). Targets táctiles ≥ 44 px, foco con `outline`
 * (nunca `ring`/`shadow-*`). Sin dependencia nueva: íconos de `lucide-react`,
 * ya instalado.
 */
export function QuantityStepper({
  max = 99,
  initial = 1,
  onChange,
  className,
}: QuantityStepperProps) {
  const [qty, setQty] = useState(Math.min(Math.max(1, initial), max));

  const set = (next: number) => {
    const clamped = Math.min(Math.max(1, next), max);
    setQty(clamped);
    onChange?.(clamped);
  };

  return (
    <div
      role="group"
      aria-label="Cantidad"
      className={cn("inline-flex items-center border border-line", className)}
    >
      <button
        type="button"
        onClick={() => set(qty - 1)}
        disabled={qty <= 1}
        aria-label="Restar"
        className="grid min-h-11 min-w-11 place-items-center text-ink outline-none transition-colors duration-ui ease-ui focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:text-ink-4"
      >
        <Minus className="h-4 w-4" aria-hidden="true" />
      </button>
      <span
        className="min-w-8 text-center text-sm tabular-nums text-ink"
        aria-live="polite"
      >
        {qty}
      </span>
      <button
        type="button"
        onClick={() => set(qty + 1)}
        disabled={qty >= max}
        aria-label="Sumar"
        className="grid min-h-11 min-w-11 place-items-center text-ink outline-none transition-colors duration-ui ease-ui focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:text-ink-4"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
