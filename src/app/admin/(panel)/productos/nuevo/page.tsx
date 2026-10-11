import { requireAdmin } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";
import { labelCategories } from "@/lib/admin/categories/labels";
import { PageHeader } from "@/components/admin/page-header";
import {
  ProductForm,
  type CategoryOption,
} from "@/app/admin/(panel)/productos/product-form";
import { productImagesPublicBase } from "@/lib/images";

export const dynamic = "force-dynamic";

export default async function NuevoProductoPage() {
  await requireAdmin();
  const categories = await prisma.category.findMany({
    where: { active: true },
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: { id: true, name: true, parentId: true },
  });
  const options: CategoryOption[] = labelCategories(categories);

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
