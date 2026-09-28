import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/catalog/pricing";
import { PageHeader } from "@/components/admin/page-header";
import { CouponForm } from "@/app/admin/(panel)/cupones/coupon-form";
import type { CouponFormInput } from "@/lib/admin/coupons/validation";

export const dynamic = "force-dynamic";

/** YYYY-MM-DD para <input type="date">, en ART (no UTC): `validFrom`/`validTo` se guardan como
 *  el inicio/fin del día en ART (ver `lib/admin/coupons/validation.ts`), así que `toISOString()`
 *  corriera `validTo` un día — hay que leer el calendario ART, no el UTC. */
function toDateInput(d: Date | null): string {
  if (!d) return "";
  return d.toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

function numToInput(n: number | null): string {
  return n == null ? "" : String(n);
}

export default async function EditarCuponPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [coupon, categories, products] = await Promise.all([
    prisma.coupon.findUnique({ where: { id } }),
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
  if (!coupon) notFound();

  const initial: CouponFormInput = {
    code: coupon.code,
    type: coupon.type,
    value:
      coupon.type === "free_shipping" ? "" : String(toNumber(coupon.value)),
    scope: coupon.scope,
    scopeId: coupon.scopeId ?? "",
    minSubtotal: numToInput(
      coupon.minSubtotal != null ? toNumber(coupon.minSubtotal) : null,
    ),
    maxUses: numToInput(coupon.maxUses),
    perCustomerLimit: numToInput(coupon.perCustomerLimit),
    validFrom: toDateInput(coupon.validFrom),
    validTo: toDateInput(coupon.validTo),
    active: coupon.active,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Editar cupón ${coupon.code}`}
        subtitle="Cambiá las condiciones del descuento. El conteo de usos no se puede editar."
      />
      <CouponForm
        couponId={coupon.id}
        initial={initial}
        categories={categories}
        products={products}
      />
    </div>
  );
}
