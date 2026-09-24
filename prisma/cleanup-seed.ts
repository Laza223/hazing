/**
 * Limpieza de datos de PRUEBA (seed) en la base.
 *
 * Borra SOLO lo que sembró `prisma/seed.ts`: los productos `demo-*` y las categorías
 * que creó el seed si quedaron sin productos. NO toca productos reales (otros slugs)
 * ni el historial de ventas reales: `OrderItem.variantId` es opcional → al borrar una
 * variante se nulea el FK pero se conservan los snapshots del pedido. `CartItem.variantId`
 * en cambio es obligatorio (sin cascada) — si algún carrito real quedó apuntando a una
 * variante demo, el borrado se aborta antes de tocar nada (ver `cartItemsAffected`).
 *
 * Uso (desde el worktree, con .env.local apuntando a la base):
 *   pnpm db:seed:clean                     # DRY-RUN: reporta, NO borra
 *   pnpm db:seed:clean -- --apply          # borra de verdad (en una transacción)
 *
 * Orden de borrado (FK-seguro): productos (cascada a variantes/reseñas/wishlist) → categorías vacías.
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { confirmProdWrite } from "../scripts/prod-write-guard.ts";

const SEED_PRODUCT_SLUGS = [
  "demo-remera-basica-algodon",
  "demo-top-escote-v",
  "demo-remera-oversize-estampada",
  "demo-pantalon-cargo",
  "demo-jean-mom-tiro-alto",
  "demo-jean-recto-clasico",
  "demo-vestido-midi-lino",
  "demo-vestido-camisero",
  "demo-buzo-oversize-friza",
  "demo-campera-denim",
  "demo-cinturon-cuero",
  "demo-panuelo-seda-estampado",
];
// Slugs de categoría que crea el seed — se borran solo si quedan sin productos.
const SEED_CATEGORY_SLUGS = [
  "jeans", // hija de "pantalones" — se evalúa antes que su padre
  "remeras-y-tops",
  "pantalones",
  "vestidos",
  "buzos-y-camperas",
  "accesorios",
];

const apply = process.argv.includes("--apply");

// La MISMA variable que lee `confirmProdWrite`: si el cliente usara DIRECT_URL
// (otro host en Supabase), la confirmación mostraría un host y el borrado
// correría contra otro.
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error(
    "❌ Falta DATABASE_URL. Corré con: node --env-file=.env.local prisma/cleanup-seed.ts",
  );
  process.exit(1);
}
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main(): Promise<void> {
  console.log(
    apply
      ? "🧹 LIMPIEZA REAL (--apply)"
      : "🔎 DRY-RUN (no borra nada). Agregá --apply para borrar.",
  );
  console.log("");

  const products = await prisma.product.findMany({
    where: { slug: { in: SEED_PRODUCT_SLUGS } },
    select: {
      id: true,
      slug: true,
      name: true,
      _count: { select: { variants: true, reviews: true, wishlistedBy: true } },
    },
  });
  const productIds = products.map((p) => p.id);
  const variants = await prisma.productVariant.findMany({
    where: { productId: { in: productIds } },
    select: { id: true },
  });
  const variantIds = variants.map((v) => v.id);

  // Datos REALES que se verían afectados (transparencia antes de borrar):
  const cartItemsAffected = await prisma.cartItem.count({
    where: { variantId: { in: variantIds } },
  });
  const orderItemsAffected = await prisma.orderItem.count({
    where: { variantId: { in: variantIds } },
  });
  const reviewsCascade = products.reduce((n, p) => n + p._count.reviews, 0);
  const wishlistCascade = products.reduce(
    (n, p) => n + p._count.wishlistedBy,
    0,
  );
  const variantsCascade = products.reduce((n, p) => n + p._count.variants, 0);

  console.log(
    `Productos seed a borrar: ${products.length}/${SEED_PRODUCT_SLUGS.length}`,
  );
  for (const p of products)
    console.log(`  - ${p.slug} (${p.name}) — ${p._count.variants} variantes`);
  console.log("");
  console.log("Efecto colateral (en cascada por FK):");
  console.log(`  · ${variantsCascade} variantes (Cascade)`);
  console.log(
    `  · ${reviewsCascade} reseñas y ${wishlistCascade} wishlist sobre esos productos (Cascade)`,
  );
  console.log(
    `  · ${orderItemsAffected} ítems de pedidos REALES → variantId nulo (snapshots intactos)`,
  );
  console.log("");

  // CartItem.variantId es obligatorio (sin onDelete) → Restrict. Si algún carrito real
  // quedó apuntando a una variante demo, el borrado fallaría a mitad de transacción.
  if (cartItemsAffected > 0) {
    console.error(
      `⛔ ABORTADO: ${cartItemsAffected} ítem(s) de carrito REAL(es) referencian variantes demo. Vaciá esos carritos a mano primero.`,
    );
    process.exit(1);
  }

  if (!apply) {
    console.log(
      "DRY-RUN: nada borrado. Repetí con `-- --apply` para borrar de verdad.",
    );
    return;
  }

  await confirmProdWrite(
    `borrar ${products.length} producto(s) demo-* y las categorías del seed que queden vacías`,
  );

  const result = await prisma.$transaction(async (tx) => {
    const delProducts = await tx.product.deleteMany({
      where: { slug: { in: SEED_PRODUCT_SLUGS } },
    });

    let delCategories = 0;
    for (const slug of SEED_CATEGORY_SLUGS) {
      const category = await tx.category.findUnique({
        where: { slug },
        select: {
          id: true,
          _count: {
            select: { products: true, children: true, productLinks: true },
          },
        },
      });
      if (!category) continue;
      const hasProducts =
        category._count.products > 0 || category._count.productLinks > 0;
      const hasChildren = category._count.children > 0;
      if (!hasProducts && !hasChildren) {
        await tx.category.delete({ where: { id: category.id } });
        delCategories++;
      }
    }

    return { delProducts, delCategories };
  });

  console.log("✅ Borrado completo:");
  console.log(
    `   ${result.delProducts.count} producto(s), ${result.delCategories} categoría(s) vacía(s).`,
  );
}

main()
  .catch((e) => {
    console.error("❌ Limpieza falló:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
