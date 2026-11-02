import { prisma } from "@/lib/prisma";
import { mergeHomeContent, type HomeContentData } from "./content";

/** Contenido vigente de la home: lo guardado en `HomeContent` sobre los defaults. */
export async function getHomeContent(): Promise<HomeContentData> {
  try {
    const row = await prisma.homeContent.findUnique({
      where: { id: "default" },
    });
    return mergeHomeContent(row?.content);
  } catch (error) {
    // La home es la portada de la tienda: si la tabla todavía no está migrada
    // o la query falla, se muestra el contenido original en vez de caerse.
    console.error("getHomeContent: usando defaults", error);
    return mergeHomeContent(null);
  }
}
