import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getProductBySlug, getCategoryTree } from "@/lib/catalog/queries";
import { buildBreadcrumbs, type CategoryNode } from "@/lib/catalog/categories";
import { getEffectivePrice, isOnSale, toNumber } from "@/lib/catalog/pricing";
import { productImageUrl } from "@/lib/images";
import { ProductGallery } from "@/components/pdp/product-gallery";
import { AddToCart, type PdpVariant } from "@/components/pdp/add-to-cart";
import { PdpAccordions } from "@/components/pdp/pdp-accordions";
import { CatalogBreadcrumbs } from "@/components/catalog/catalog-breadcrumbs";

/** Base pública de la app para URLs absolutas de metadata/JSON-LD. Mismo
 *  fallback que usa el resto del proyecto para dev/preview sin la env seteada. */
function absoluteUrl(path: string): string {
  const base = (
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  ).replace(/\/$/, "");
  return `${base}${path}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  // Con `loading.tsx` la ruta streamea: un producto inexistente responde 200
  // (medido en build de producción, también con user-agent de bot), pero Next
  // inyecta `<meta name="robots" content="noindex">`, así que no se indexa.
  // Mismo comportamiento que glamify. notFound() acá evita armar metadata falsa.
  if (!product) notFound();

  const description =
    product.seoDescription ?? product.description ?? undefined;
  const image = product.images[0] ? productImageUrl(product.images[0]) : null;

  return {
    title: product.seoTitle ? { absolute: product.seoTitle } : product.name,
    description,
    alternates: { canonical: absoluteUrl(`/producto/${slug}`) },
    openGraph: {
      type: "website",
      title: product.name,
      description,
      url: absoluteUrl(`/producto/${slug}`),
      images: image ? [image] : undefined,
    },
  };
}

export default async function ProductoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const price = getEffectivePrice(product);
  const onSale = isOnSale(product);
  const compareAtPrice = onSale ? toNumber(product.compareAtPrice) : undefined;

  const images = product.images
    .map((path) => productImageUrl(path))
    .filter((src): src is string => Boolean(src));

  const variants: PdpVariant[] = product.variants.map((v) => ({
    id: v.id,
    size: v.size,
    color: v.color,
    swatchHex: v.swatchHex,
    stock: v.stock,
    lowStockThreshold: v.lowStockThreshold,
    price: getEffectivePrice(product, v),
  }));

  // Categorías tienen máx. 2 niveles (ver CLAUDE.md): resuelve si `product.category`
  // es una raíz o una subcategoría buscándola en el árbol, para armar el breadcrumb
  // completo (Inicio / Categoría / Subcategoría) sin repetir el nombre del producto,
  // que ya está en el H1 (punto 9 de la revisión de UX).
  const tree = await getCategoryTree();
  let breadcrumbCategory: CategoryNode | null = null;
  let breadcrumbSubcategory: CategoryNode | null = null;
  for (const root of tree) {
    if (root.id === product.categoryId) {
      breadcrumbCategory = root;
      break;
    }
    const child = root.children.find((c) => c.id === product.categoryId);
    if (child) {
      breadcrumbCategory = root;
      breadcrumbSubcategory = child;
      break;
    }
  }
  const crumbs = buildBreadcrumbs({
    category: breadcrumbCategory,
    subcategory: breadcrumbSubcategory,
  });

  const inStock = product.variants.some((v) => v.stock > 0);
  const productUrl = absoluteUrl(`/producto/${slug}`);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.seoDescription ?? product.description ?? undefined,
    image: images,
    sku: product.variants[0]?.sku,
    offers: {
      "@type": "Offer",
      price: price.toFixed(2),
      priceCurrency: "ARS",
      availability: `https://schema.org/${inStock ? "InStock" : "OutOfStock"}`,
      url: productUrl,
    },
  };

  return (
    <article className="mx-auto max-w-[1600px] px-4 pb-8 pt-8 md:px-10">
      {/* eslint-disable-next-line react/no-danger */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <div className="grid gap-8 md:grid-cols-12 md:items-start">
        <div className="md:col-span-7">
          <ProductGallery images={images} name={product.name} />
        </div>

        <div className="md:sticky md:top-24 md:col-span-5 md:self-start">
          <CatalogBreadcrumbs items={crumbs} />
          <h1 className="mt-2 font-display text-2xl text-ink">
            {product.name}
          </h1>

          <div className="mt-6">
            <AddToCart
              productName={product.name}
              variants={variants}
              sizeSystem={product.sizeSystem}
              compareAtPrice={compareAtPrice}
            />
          </div>

          <div className="mt-8">
            <PdpAccordions />
          </div>
        </div>
      </div>
    </article>
  );
}
