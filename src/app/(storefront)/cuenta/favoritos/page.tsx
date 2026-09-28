import Link from "next/link";
import { requireCustomer } from "@/lib/customer/auth";
import { prisma } from "@/lib/prisma";
import { ProductGrid } from "@/components/catalog/product-grid";
import { PRODUCT_INCLUDE } from "@/lib/catalog/queries";
import type { CatalogListItem } from "@/lib/catalog/types";

export default async function FavoritosPage() {
  const customer = await requireCustomer();
  const rows = await prisma.wishlist.findMany({
    where: { customerId: customer.id },
    orderBy: { createdAt: "desc" },
    include: { product: { include: PRODUCT_INCLUDE } },
  });
  const products = rows
    .map((r) => r.product)
    .filter((p) => p.active && !p.deletedAt) as CatalogListItem[];

  if (products.length === 0) {
    return (
      <div className="border border-dashed border-line p-8 text-center text-ink-2">
        <p>Todavía no guardaste favoritos.</p>
        <Link
          href="/tienda"
          className="mt-3 inline-block text-ink underline underline-offset-4"
        >
          Explorar la tienda
        </Link>
      </div>
    );
  }

  return <ProductGrid products={products} />;
}
