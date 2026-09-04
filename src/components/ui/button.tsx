import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Button — primitiva de UI (docs/spec/05-direccion-arte.md §3.2, §7).
 *
 * Transiciones SOLO de color/borde/opacidad en `duration-ui`/`ease-ui`
 * (250ms) — nunca `transform`/`scale` (regla dura de esta tarea). Foco
 * visible con `outline` (Tailwind `ring-*` es box-shadow, prohibido por el
 * brief); nunca `shadow-*`.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-control text-sm font-medium outline-none transition-colors duration-ui ease-ui focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        solid: "bg-ink text-paper hover:bg-ink-2",
        outline: "border border-ink text-ink hover:bg-line-2",
        text: "text-ink underline underline-offset-4 hover:text-ink-2",
      },
      size: {
        // ~40px — controles secundarios.
        sm: "h-10 px-4",
        // 48px — "Agregar al carrito" en PDP (§7); el carrito real es Fase 6.
        md: "h-12 px-6",
      },
    },
    defaultVariants: { variant: "solid", size: "md" },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
