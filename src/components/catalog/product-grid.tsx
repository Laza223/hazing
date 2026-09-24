import { productImageUrl } from "@/lib/images";
import { getEffectivePrice, isOnSale, toNumber } from "@/lib/catalog/pricing";
import { isAvailable } from "@/lib/catalog/stock";
import { ProductTile } from "@/components/catalog/product-tile";
import type { CatalogListItem } from "@/lib/catalog/types";

/**
 * ProductGrid — grilla de catálogo: 2 columnas mobile, 3 desde `md`, 4 desde
 * `xl` (docs/spec/05-direccion-arte.md §3.1, handoff §8.4). Gutter 16/24 px.
 * `priority` solo en los primeros 4 tiles (candidatos a LCP, §10).
 */
export function ProductGrid({ products }: { products: CatalogListItem[] }) {
  return (
    <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 xl:grid-cols-4">
      {products.map((product, index) => {
        const onSale = isOnSale(product);
        return (
          <li key={product.id}>
            <ProductTile
              href={`/producto/${product.slug}`}
              name={product.name}
              price={getEffectivePrice(product)}
              compareAtPrice={
                onSale ? toNumber(product.compareAtPrice) : undefined
              }
              imageSrc={productImageUrl(product.images[0])}
              imageSrcHover={productImageUrl(product.images[1])}
              imageAlt={product.name}
              isAvailable={isAvailable(product.variants)}
              priority={index < 4}
            />
          </li>
        );
      })}
    </ul>
  );
}
