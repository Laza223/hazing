export default function CuentaLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Cargando cuenta...">
      <div className="h-5 w-40 animate-pulse bg-line-2" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-32 animate-pulse border border-line" />
        <div className="h-32 animate-pulse border border-line" />
      </div>
    </div>
  );
}
