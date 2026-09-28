import { Skeleton } from "@/components/ui/skeleton";

export default function AdminPanelLoading() {
  return (
    <div
      className="space-y-8"
      aria-busy="true"
      aria-label="Cargando panel de administración…"
    >
      <div className="space-y-2 border-b border-line pb-6">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}
