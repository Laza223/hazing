import { requireAdmin } from "@/lib/admin/auth";
import { PageHeader } from "@/components/admin/page-header";
import { SettingsForm } from "./settings-form";
import { prisma } from "@/lib/prisma";
import {
  getNationwideShippingPrice,
  type NationwideZoneDb,
} from "@/lib/admin/shipping-zone";

export const dynamic = "force-dynamic";

export default async function AdminAjustesPage() {
  await requireAdmin();
  const setting = await prisma.setting.findUnique({ where: { id: "default" } });
  const shippingPrice = await getNationwideShippingPrice(
    prisma as unknown as NationwideZoneDb,
  );

  const initialSettings = {
    storeName: setting?.storeName ?? "Hazing",
    freeShippingThreshold:
      setting?.freeShippingThreshold != null
        ? Number(setting.freeShippingThreshold)
        : null,
    shippingPrice,
    shippingSurcharge:
      setting?.shippingSurcharge != null
        ? Number(setting.shippingSurcharge)
        : 2000,
    originPostalCode: setting?.originPostalCode ?? "6700",
    whatsappNumber: setting?.whatsappNumber ?? null,
    instagramUrl: setting?.instagramUrl ?? null,
    tiktokUrl: setting?.tiktokUrl ?? null,
    pickupAddress: setting?.pickupAddress ?? null,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ajustes de la tienda"
        subtitle="Configurá los datos generales de la tienda, el umbral de envío gratis y los canales de atención."
      />

      <SettingsForm initialSettings={initialSettings} />
    </div>
  );
}
