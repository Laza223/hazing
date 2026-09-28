export default function PedidosLoading() {
  return (
    <div
      className="space-y-3"
      aria-busy="true"
      aria-label="Cargando historial de pedidos..."
    >
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-16 animate-pulse border border-line" />
      ))}
    </div>
  );
}
