"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";

import { cn } from "@/lib/utils";

/**
 * Label — texto de campo genérico (Radix). Para inputs con label+input ya
 * asociados usar `TextInput`; este queda para armar formularios a medida
 * (selects, textareas, grillas de variantes) en 7.2/7.3.
 */
const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(
      "tracking-caps-sm text-xs font-medium uppercase text-ink-2",
      className,
    )}
    {...props}
  />
));
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
