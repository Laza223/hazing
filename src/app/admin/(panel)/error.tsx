"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function AdminPanelError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center gap-4 rounded-control border border-dashed border-line p-12 text-center">
      <AlertTriangle className="size-8 text-ink-3" aria-hidden />
      <div>
        <p className="text-lg font-medium text-ink">
          Ocurrió un error en el panel
        </p>
        <p className="mt-1 max-w-md text-sm text-ink-3">
          {error.message || "No se pudo cargar esta sección."}
          {error.digest ? ` (ref: ${error.digest})` : ""}
        </p>
      </div>
      <Button onClick={() => reset()}>Reintentar</Button>
    </div>
  );
}
