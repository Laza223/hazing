import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/page-header";
import {
  ProductForm,
  type CategoryOption,
} from "@/app/admin/(panel)/productos/product-form";
import { productImagesPublicBase } from "@/lib/images";

export const dynamic = "force-dynamic";

export default async function NuevoProductoPage() {
  const categories = await prisma.category.findMany({
    where: { active: true },
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  });
  const options: CategoryOption[] = categories.map((c) => ({
    id: c.id,
    name: c.name,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nuevo producto"
        subtitle="Cargá un producto con sus fotos, talles, colores y stock."
      />
      <ProductForm
        categories={options}
        publicBase={productImagesPublicBase()}
      />
    </div>
  );
}
