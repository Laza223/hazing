import type { MetadataRoute } from "next";
import { getActiveProductSlugs, getCategoryTree } from "@/lib/catalog/queries";
import { absoluteUrl } from "@/lib/seo/url";

// Consulta la DB: sin esto Next intentaría prerenderizarlo en el build.
export const dynamic = "force-dynamic";

const STATIC_PAGES = [
  "/terminos",
  "/privacidad",
  "/arrepentimiento",
  "/envios-y-cambios",
  "/guia-de-talles",
  "/preguntas-frecuentes",
  "/contacto",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [slugs, tree] = await Promise.all([
    getActiveProductSlugs(),
    getCategoryTree(),
  ]);
  const now = new Date();
  const categories = tree.flatMap((c) => [
    { url: absoluteUrl(`/tienda/${c.slug}`), lastModified: now },
    ...c.children.map((s) => ({
      url: absoluteUrl(`/tienda/${c.slug}/${s.slug}`),
      lastModified: now,
    })),
  ]);
  return [
    { url: absoluteUrl("/"), lastModified: now },
    { url: absoluteUrl("/tienda"), lastModified: now },
    ...STATIC_PAGES.map((p) => ({ url: absoluteUrl(p), lastModified: now })),
    ...categories,
    ...slugs.map((slug) => ({
      url: absoluteUrl(`/producto/${slug}`),
      lastModified: now,
    })),
  ];
}
