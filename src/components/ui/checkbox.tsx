"use client";

import * as React from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Checkbox — nativo (sin `@radix-ui/react-checkbox`: no está entre las deps
 * instaladas, ver docs/spec/07-admin.md §4). `peer` + ícono posicionado
 * encima; foco con `outline` en el propio input (visible aunque quede
 * transparente).
 */
export type CheckboxProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
>;

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, ...props }, ref) => (
    <span className="relative inline-flex size-5 shrink-0">
      <input
        ref={ref}
        type="checkbox"
        className={cn(
          "peer size-5 shrink-0 appearance-none rounded-control border border-line bg-paper outline-none transition-colors duration-ui ease-ui checked:bg-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
      <Check
        aria-hidden
        className="pointer-events-none absolute inset-0 m-auto size-3.5 text-paper opacity-0 peer-checked:opacity-100"
      />
    </span>
  ),
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
