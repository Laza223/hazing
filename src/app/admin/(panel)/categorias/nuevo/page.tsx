import { requireAdmin } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/page-header";
import {
  CategoryForm,
  type ParentOption,
} from "@/app/admin/(panel)/categorias/category-form";

export const dynamic = "force-dynamic";

async function loadRootParents(): Promise<ParentOption[]> {
  return prisma.category.findMany({
    where: { parentId: null },
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  });
}

export default async function NuevaCategoriaPage() {
  await requireAdmin();
  const parents = await loadRootParents();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Nueva categoría"
        subtitle="Cargá una categoría nueva. Si elegís una categoría padre, va a ser una subcategoría."
      />
      <CategoryForm parents={parents} />
    </div>
  );
}
