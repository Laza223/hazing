import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/page-header";
import { CouponForm } from "@/app/admin/(panel)/cupones/coupon-form";

export const dynamic = "force-dynamic";

export default async function NuevoCuponPage() {
  const [categories, products] = await Promise.all([
    prisma.category.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.product.findMany({
      where: { active: true, deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nuevo cupón"
        subtitle="Creá un código de descuento para que tus clientas paguen menos."
      />
      <CouponForm categories={categories} products={products} />
    </div>
  );
}
