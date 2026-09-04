"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";

import { cn } from "@/lib/utils";

export interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
}

/**
 * TextInput — label + input asociados vía Radix Label (accesibilidad, ver
 * docs/spec/05-direccion-arte.md §3.2, §11). Texto mínimo 16px del proyecto
 * (evita el zoom automático de iOS en foco). Foco con `outline`, nunca
 * `ring`/`shadow-*`.
 */
const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
  ({ className, label, id, ...props }, ref) => {
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
          className={cn(
            "h-12 rounded-control border border-line bg-paper px-3 text-base text-ink outline-none transition-colors duration-ui ease-ui placeholder:text-ink-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
            className,
          )}
          {...props}
        />
      </div>
    );
  },
);
TextInput.displayName = "TextInput";

export { TextInput };
