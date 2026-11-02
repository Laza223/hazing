import { prisma } from "@/lib/prisma";
import type { HomeContentData } from "@/lib/home/content";

/** Superficie mínima de Prisma que usa el servicio (para inyectar fakes en tests). */
export interface HomeContentDb {
  homeContent: {
    upsert: (args: {
      where: { id: string };
      create: { id: string; content: HomeContentData };
      update: { content: HomeContentData };
    }) => Promise<unknown>;
  };
}

export interface HomeContentDeps {
  db: HomeContentDb;
}

export function defaultHomeContentDeps(): HomeContentDeps {
  return { db: prisma as unknown as HomeContentDb };
}

/** Guarda la home completa (ya validada) en la fila singleton. */
export async function saveHomeContent(
  content: HomeContentData,
  deps: HomeContentDeps,
): Promise<void> {
  await deps.db.homeContent.upsert({
    where: { id: "default" },
    create: { id: "default", content },
    update: { content },
  });
}
