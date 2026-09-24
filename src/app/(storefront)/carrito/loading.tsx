export default function CarritoLoading() {
  return (
    <div
      className="mx-auto max-w-[1600px] px-4 py-10 md:px-10"
      aria-busy="true"
      aria-label="Cargando carrito…"
    >
      <div className="h-8 w-40 animate-pulse bg-line-2" />
      <div className="mt-8 grid gap-10 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-7">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 w-full animate-pulse bg-line-2" />
          ))}
        </div>
        <div className="space-y-4 lg:col-span-5">
          <div className="h-24 w-full animate-pulse bg-line-2" />
          <div className="h-32 w-full animate-pulse bg-line-2" />
        </div>
      </div>
    </div>
  );
}
