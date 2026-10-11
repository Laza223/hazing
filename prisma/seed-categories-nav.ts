/**
 * Estructura del menú: raíces Essentials / Night Looks con sus secciones.
 *
 * Idempotente: crea lo que falta y no toca lo que ya existe. Oculta del menú
 * (`showInMenu: false`) las 5 categorías planas de `seed-categories.ts`; los
 * productos se reasignan a mano desde el admin. No borra nada.
 *
 * Uso:  pnpm db:seed:categories-nav
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { confirmProdWrite } from "../scripts/prod-write-guard.ts";

interface Section {
  slug: string;
  name: string;
  skuPrefix: string;
}

const GROUPS: {
  slug: string;
  name: string;
  skuPrefix: string;
  order: number;
  sections: Section[];
}[] = [
  {
    slug: "essentials",
    name: "Essentials",
    skuPrefix: "ESS",
    order: 10,
    sections: [
      { slug: "essentials-tops", name: "Tops", skuPrefix: "ETP" },
      { slug: "essentials-remeras", name: "Remeras", skuPrefix: "ERM" },
      { slug: "essentials-musculosas", name: "Musculosas", skuPrefix: "EMU" },
      { slug: "essentials-denim", name: "Denim", skuPrefix: "EDN" },
      { slug: "essentials-shorts", name: "Shorts", skuPrefix: "ESH" },
      { slug: "essentials-vestidos", name: "Vestidos", skuPrefix: "EVE" },
      { slug: "essentials-polleras", name: "Polleras", skuPrefix: "EPO" },
      { slug: "essentials-deportivo", name: "Deportivo", skuPrefix: "EDE" },
      { slug: "essentials-abrigos", name: "Abrigos", skuPrefix: "EAB" },
    ],
  },
  {
    slug: "night-looks",
    name: "Night Looks",
    skuPrefix: "NIG",
    order: 11,
    sections: [
      { slug: "night-tops", name: "Tops", skuPrefix: "NTP" },
      { slug: "night-bodies", name: "Bodies", skuPrefix: "NBO" },
      {
        slug: "night-shorts-polleras",
        name: "Shorts-Polleras",
        skuPrefix: "NSP",
      },
      { slug: "night-vestidos", name: "Vestidos", skuPrefix: "NVE" },
      { slug: "night-pantalones", name: "Pantalones", skuPrefix: "NPA" },
    ],
  },
];

const FLAT_SLUGS = [
  "tops",
  "bodys",
  "bodies",
  "remeras",
  "jeans",
  "shorts",
  "polleras",
  "vestidos",
];

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error(
    "Falta DATABASE_URL. Corré con: node --env-file=.env.local prisma/seed-categories-nav.ts",
  );
  process.exit(1);
}
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main(): Promise<void> {
  const allSlugs = GROUPS.flatMap((g) => [
    g.slug,
    ...g.sections.map((s) => s.slug),
  ]);
  const existing = await prisma.category.findMany({
    where: { slug: { in: allSlugs } },
    select: { slug: true },
  });
  const have = new Set(existing.map((c) => c.slug));
  const toCreate = allSlugs.filter((s) => !have.has(s));
  const toHide = await prisma.category.count({
    where: { slug: { in: FLAT_SLUGS }, showInMenu: true },
  });

  if (toCreate.length === 0 && toHide === 0) {
    console.log("Nada para hacer.");
    return;
  }

  await confirmProdWrite(
    `crear ${toCreate.length} categoría(s) y ocultar ${toHide} del menú`,
  );

  for (const g of GROUPS) {
    const root = await prisma.category.upsert({
      where: { slug: g.slug },
      update: {},
      create: {
        slug: g.slug,
        name: g.name,
        skuPrefix: g.skuPrefix,
        order: g.order,
        showInMenu: true,
      },
    });
    for (const [i, s] of g.sections.entries()) {
      await prisma.category.upsert({
        where: { slug: s.slug },
        update: {},
        create: {
          slug: s.slug,
          name: s.name,
          skuPrefix: s.skuPrefix,
          order: i,
          parentId: root.id,
          showInMenu: true,
        },
      });
    }
    console.log(`  ${g.name}: ${g.sections.length} secciones`);
  }

  await prisma.category.updateMany({
    where: { slug: { in: FLAT_SLUGS } },
    data: { showInMenu: false },
  });
  console.log("Listo. Reasigná los productos desde el admin.");
}

main()
  .catch((e) => {
    console.error("Falló:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
