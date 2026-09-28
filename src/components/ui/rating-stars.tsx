"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * RatingStars — 5 íconos Lucide, sin color (relleno `ink` vs contorno
 * `line-2`, ver CLAUDE.md "Estados sin rojo ni verde"). Texto accesible
 * ("4 de 5") en el `aria-label` del contenedor.
 */
export function RatingStars({
  value,
  size = "md",
}: {
  value: number;
  size?: "sm" | "md";
}) {
  const px = size === "sm" ? "size-3.5" : "size-5";
  return (
    <span className="inline-flex" aria-label={`${value} de 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            px,
            n <= Math.round(value) ? "fill-ink text-ink" : "text-line-2",
          )}
          aria-hidden
        />
      ))}
    </span>
  );
}

export function RatingInput({
  name,
  defaultValue = 0,
}: {
  name: string;
  defaultValue?: number;
}) {
  const [value, setValue] = useState(defaultValue);
  return (
    <span className="inline-flex gap-1" role="radiogroup" aria-label="Puntaje">
      <input type="hidden" name={name} value={value} />
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} estrella${n > 1 ? "s" : ""}`}
          onClick={() => setValue(n)}
          className="outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <Star
            className={cn(
              "size-7",
              n <= value ? "fill-ink text-ink" : "text-line-2",
            )}
            aria-hidden
          />
        </button>
      ))}
    </span>
  );
}
