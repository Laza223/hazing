import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/catalog/pricing";
import { PageHeader } from "@/components/admin/page-header";
import {
  ProductForm,
  type CategoryOption,
} from "@/app/admin/(panel)/productos/product-form";
import { DeleteProductButton } from "@/app/admin/(panel)/productos/delete-product-button";
import { productImagesPublicBase } from "@/lib/images";
import type { ProductFormInput } from "@/lib/admin/products/validation";

export const dynamic = "force-dynamic";

export default async function EditarProductoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [product, categories] = await Promise.all([
    prisma.product.findFirst({
      where: { id, deletedAt: null },
      include: {
        // Activas E inactivas: el switch "Activa" por variante necesita traer su estado real para
        // no perderse. Si se filtrara acá, una variante desactivada con el switch (pero cuyo
        // talle/color siguen tildados por otra fila) desaparecería del form y `rebuild()` la
        // recrearía como fila nueva al guardar — reactivándola en silencio (ver
        // `src/lib/admin/products/variant-grid.ts`).
        variants: { orderBy: { order: "asc" } },
        categories: { select: { categoryId: true } },
      },
    }),
    prisma.category.findMany({
      where: { active: true },
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
  ]);
  if (!product) notFound();

  const options: CategoryOption[] = categories.map((c) => ({
    id: c.id,
    name: c.name,
  }));

  const initial: ProductFormInput = {
    name: product.name,
    slug: product.slug,
    description: product.description,
    categoryId: product.categoryId,
    extraCategoryIds: product.categories.map((c) => c.categoryId),
    sizeSystem: product.sizeSystem,
    basePrice: toNumber(product.basePrice),
    compareAtPrice:
      product.compareAtPrice != null ? toNumber(product.compareAtPrice) : null,
    cost: toNumber(product.cost),
    images: product.images,
    isFeatured: product.isFeatured,
    heroRank: product.heroRank,
    tags: product.tags,
    seoTitle: product.seoTitle,
    seoDescription: product.seoDescription,
    active: product.active,
    variants: product.variants.map((v) => ({
      id: v.id,
      size: v.size,
      color: v.color,
      swatchHex: v.swatchHex,
      sku: v.sku,
      stock: v.stock,
      lowStockThreshold: v.lowStockThreshold,
      priceOverride: v.priceOverride != null ? toNumber(v.priceOverride) : null,
      image: v.image,
      active: v.active,
      order: v.order,
    })),
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Editar: ${product.name}`}
        subtitle="Cambiá datos, precios, stock o variantes."
        action={<DeleteProductButton id={product.id} name={product.name} />}
      />
      <ProductForm
        categories={options}
        publicBase={productImagesPublicBase()}
        productId={product.id}
        initial={initial}
      />
    </div>
  );
}
