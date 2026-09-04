import { ProductTile } from "@/components/catalog/product-tile";

/**
 * Placeholder de home para la sub-fase 5.1 — ejercita las primitivas del
 * shell para verificación visual. La home coreografiada completa
 * (Hero, NewIn, Lookbook, etc.) es la sub-fase 5.2, fuera de esta tarea.
 */
export default function HomePage() {
  return (
    <div className="mx-auto max-w-[1600px] px-4 py-16 md:px-10">
      <h1 className="tracking-caps-lg font-display text-4xl uppercase text-ink md:text-6xl">
        Hazing
      </h1>
      <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        <ProductTile
          href="/producto/placeholder-1"
          name="Prenda de ejemplo 1"
          price={45000}
          imageAlt="Prenda de ejemplo 1"
          imageSrc={null}
        />
        <ProductTile
          href="/producto/placeholder-2"
          name="Prenda de ejemplo 2"
          price={38000}
          compareAtPrice={52000}
          imageAlt="Prenda de ejemplo 2"
          imageSrc={null}
        />
        <ProductTile
          href="/producto/placeholder-3"
          name="Prenda de ejemplo 3"
          price={29900}
          imageAlt="Prenda de ejemplo 3"
          imageSrc={null}
        />
      </div>
    </div>
  );
}
