/** Skeleton de la PDP — sin dependencia nueva, mismo criterio de placeholder
 *  que el resto del storefront (bloques `animate-pulse bg-line-2`). */
export default function ProductoLoading() {
  return (
    <div
      className="mx-auto max-w-[1600px] px-4 pb-8 pt-8 md:px-10"
      aria-busy="true"
      aria-label="Cargando producto…"
    >
      <div className="grid gap-8 md:grid-cols-12">
        <div className="md:col-span-7">
          <div className="aspect-[3/4] w-full animate-pulse bg-line-2" />
        </div>
        <div className="space-y-4 md:col-span-5">
          <div className="h-3 w-24 animate-pulse bg-line-2" />
          <div className="h-8 w-2/3 animate-pulse bg-line-2" />
          <div className="h-5 w-24 animate-pulse bg-line-2" />
          <div className="h-12 w-full animate-pulse bg-line-2" />
        </div>
      </div>
    </div>
  );
}
