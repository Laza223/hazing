import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * PageHeader — API: `title` (obligatorio), `subtitle` (línea que explica
 * "para qué sirve esta pantalla", tan simple que la entienda un nene),
 * `action` (botón/badge principal a la derecha, ej. "Nuevo producto").
 * Reusar en toda página de `admin/(panel)/*` para encabezado consistente.
 */
export interface PageHeaderProps {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  action,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "mb-8 flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="space-y-1.5">
        <h1 className="text-2xl font-medium leading-tight text-ink">{title}</h1>
        <p className="max-w-prose text-sm text-ink-3">{subtitle}</p>
      </div>
      {action ? (
        <div className="flex shrink-0 items-center gap-2">{action}</div>
      ) : null}
    </header>
  );
}
