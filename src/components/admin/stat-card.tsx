import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * StatCard — API: `title` (rótulo corto), `value` (ya formateado, ej. "$
 * 12.500,00" o "3"), `hint` (línea de ayuda opcional), `icon` (Lucide). Card
 * de número grande para el dashboard — sin glow ni sombra, borde `line`.
 */
export interface StatCardProps {
  title: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  className?: string;
}

export function StatCard({
  title,
  value,
  hint,
  icon: Icon,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-control border border-line bg-paper p-5",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-ink-3">{title}</p>
        <Icon className="size-5 shrink-0 text-ink-3" aria-hidden />
      </div>
      <p className="mt-3 text-3xl font-medium tabular-nums leading-tight text-ink">
        {value}
      </p>
      {hint ? <p className="mt-1.5 text-xs text-ink-4">{hint}</p> : null}
    </div>
  );
}
