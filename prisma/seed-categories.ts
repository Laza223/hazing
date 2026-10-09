/**
 * Categorías reales de la tienda (sin productos).
 *
 * Idempotente: crea las que faltan y deja como están las que ya existen.
 * Independiente del seed de demo (que usa categorías `demo-*` propias);
 * `db:seed:clean` no toca estas categorías.
 *
 * Uso:  pnpm db:seed:categories
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { confirmProdWrite } from "../scripts/prod-write-guard.ts";

const CATEGORIES = [
  { slug: "tops", name: "Tops", skuPrefix: "TOP", order: 0 },
  { slug: "bodys", name: "Bodys", skuPrefix: "BOD", order: 1 },
  { slug: "remeras", name: "Remeras", skuPrefix: "REM", order: 2 },
  { slug: "jeans", name: "Jeans", skuPrefix: "JEA", order: 3 },
  { slug: "shorts", name: "Shorts", skuPrefix: "SHO", order: 4 },
] as const;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error(
    "Falta DATABASE_URL. Corré con: node --env-file=.env.local prisma/seed-categories.ts",
  );
  process.exit(1);
}
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main(): Promise<void> {
  const existing = await prisma.category.findMany({
    where: { slug: { in: CATEGORIES.map((c) => c.slug) } },
    select: { slug: true },
  });
  const have = new Set(existing.map((c) => c.slug));
  const missing = CATEGORIES.filter((c) => !have.has(c.slug));

  if (missing.length === 0) {
    console.log("Las 5 categorías ya existen. Nada para crear.");
    return;
  }

  await confirmProdWrite(
    `crear ${missing.length} categoría(s): ${missing.map((c) => c.name).join(", ")}`,
  );

  for (const c of missing) {
    await prisma.category.create({ data: { ...c } });
    console.log(`  + ${c.name} (/tienda/${c.slug})`);
  }
  console.log("Listo.");
}

main()
  .catch((e) => {
    console.error("Falló:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
