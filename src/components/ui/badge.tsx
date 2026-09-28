import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Badge — SOLO texto en mayúsculas 12px con borde `line`, nunca color de
 * estado (docs/spec/07-admin.md §3.1, CLAUDE.md "estados sin rojo ni
 * verde"). El estado se distingue por el propio texto ("PENDIENTE",
 * "APROBADA"), no por variantes de color.
 */
function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "tracking-caps-sm inline-flex items-center gap-1.5 rounded-control border border-line px-2 py-1 text-xs font-medium uppercase text-ink-2",
        className,
      )}
      {...props}
    />
  );
}

export { Badge };
