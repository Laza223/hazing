import { requireAdmin } from "@/lib/admin/auth";
import { PageHeader } from "@/components/admin/page-header";
import { getHomeContent } from "@/lib/home/get-home-content";
import { HomeForm } from "./home-form";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  await requireAdmin();
  const content = await getHomeContent();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contenido del home"
        subtitle="Cambiá las fotos, textos y links de la página de inicio. Lo que guardes se ve en la tienda al instante."
      />
      <HomeForm initial={content} />
    </div>
  );
}
