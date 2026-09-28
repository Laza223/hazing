"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { AlertCircle } from "lucide-react";

import { cn } from "@/lib/utils";

export interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
  /** Mensaje de error (a11y: WCAG 2.4.7 / entrega-feature §2 revisión adversarial
   *  Fase 8) — forma + texto, nunca color. Setealo y el input queda
   *  `aria-invalid` con `aria-describedby` apuntando al mensaje. */
  error?: string;
}

/**
 * TextInput — label + input asociados vía Radix Label (accesibilidad, ver
 * docs/spec/05-direccion-arte.md §3.2, §11). Texto mínimo 16px del proyecto
 * (evita el zoom automático de iOS en foco). Foco con `outline`, nunca
 * `ring`/`shadow-*`.
 */
const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
  (
    { className, label, id, error, "aria-describedby": describedBy, ...props },
    ref,
  ) => {
    const errorId = `${id}-error`;
    return (
      <div className="flex flex-col gap-1">
        <LabelPrimitive.Root
          htmlFor={id}
          className="tracking-caps-sm text-xs font-medium uppercase text-ink-2"
        >
          {label}
        </LabelPrimitive.Root>
        <input
          ref={ref}
          id={id}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={
            error
              ? [errorId, describedBy].filter(Boolean).join(" ")
              : describedBy
          }
          className={cn(
            "h-12 rounded-control border border-line bg-paper px-3 text-base text-ink outline-none transition-colors duration-ui ease-ui placeholder:text-ink-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
            className,
          )}
          {...props}
        />
        {error && (
          <p id={errorId} className="flex items-center gap-1 text-xs text-ink">
            <AlertCircle className="size-3.5 shrink-0" aria-hidden />
            {error}
          </p>
        )}
      </div>
    );
  },
);
TextInput.displayName = "TextInput";

export { TextInput };
