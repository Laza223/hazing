import { PrismaClient, type Prisma, type SizeSystem } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { confirmProdWrite } from "../scripts/prod-write-guard.ts";
import { SIZE_SCALES } from "../src/lib/catalog/sizes.ts";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// ---- Catálogo de prueba (dev/preview). "No humo": stock y ofertas con datos reales. ----
// Talles tomados de src/lib/catalog/sizes.ts (ADR 0001) — no se reinventan acá.
const [XS, S, M, L, XL] = SIZE_SCALES.letters;
const [, N36, N38, N40, N42, N44] = SIZE_SCALES.numeric;
const [UNICO] = SIZE_SCALES.one_size;

/** Generador de SKU local al script (Hazing no tiene src/lib/sku.ts todavía —
 *  ver reporte de la sub-fase 6.1). Formato {PREFIJO}-{NNNN}, igual que el resto del dominio. */
function generateSku(prefix: string, sequence: number): string {
  const clean = prefix.trim().toUpperCase().slice(0, 3);
  return `${clean}-${String(sequence).padStart(4, "0")}`;
}

interface SeedCategory {
  slug: string;
  name: string;
  skuPrefix: string;
  order: number;
  /** Si tiene, es subcategoría (2 niveles máx, ver Category.parentId). */
  parentSlug?: string;
}

const CATEGORIES: SeedCategory[] = [
  {
    slug: "remeras-y-tops",
    name: "Remeras y Tops",
    skuPrefix: "REM",
    order: 0,
  },
  { slug: "pantalones", name: "Pantalones", skuPrefix: "PAN", order: 1 },
  {
    slug: "jeans",
    name: "Jeans",
    skuPrefix: "JEA",
    order: 0,
    parentSlug: "pantalones",
  },
  { slug: "vestidos", name: "Vestidos", skuPrefix: "VES", order: 2 },
  {
    slug: "buzos-y-camperas",
    name: "Buzos y Camperas",
    skuPrefix: "BUZ",
    order: 3,
  },
  { slug: "accesorios", name: "Accesorios", skuPrefix: "ACC", order: 4 },
];

interface SeedVariant {
  size: string;
  color: string;
  swatchHex: string;
  stock: number;
}
interface SeedProduct {
  slug: string;
  name: string;
  categorySlug: string;
  sizeSystem: SizeSystem;
  description: string;
  basePrice: number;
  compareAtPrice?: number; // solo si > basePrice (oferta real)
  cost: number;
  isFeatured?: boolean;
  heroRank?: number;
  tags?: string[];
  variants: SeedVariant[];
}

const PRODUCTS: SeedProduct[] = [
  {
    slug: "demo-remera-basica-algodon",
    name: "Remera Básica de Algodón",
    categorySlug: "remeras-y-tops",
    sizeSystem: "letters",
    description: "Remera de algodón peinado, corte clásico, para el día a día.",
    basePrice: 15000,
    cost: 6000,
    isFeatured: true,
    heroRank: 1,
    tags: ["básica", "algodón"],
    variants: [
      { size: S, color: "Negro", swatchHex: "#171717", stock: 12 },
      { size: M, color: "Negro", swatchHex: "#171717", stock: 18 },
      { size: L, color: "Negro", swatchHex: "#171717", stock: 0 },
      { size: S, color: "Blanco", swatchHex: "#FFFFFF", stock: 10 },
      { size: M, color: "Blanco", swatchHex: "#FFFFFF", stock: 14 },
      { size: L, color: "Blanco", swatchHex: "#FFFFFF", stock: 6 },
    ],
  },
  {
    slug: "demo-top-escote-v",
    name: "Top Escote V",
    categorySlug: "remeras-y-tops",
    sizeSystem: "letters",
    description:
      "Top liviano con escote en V, ideal para combinar o usar solo.",
    basePrice: 12000,
    compareAtPrice: 16000,
    cost: 5000,
    isFeatured: true,
    heroRank: 2,
    tags: ["top"],
    variants: [
      { size: S, color: "Negro", swatchHex: "#171717", stock: 8 },
      { size: M, color: "Negro", swatchHex: "#171717", stock: 15 },
      { size: L, color: "Negro", swatchHex: "#171717", stock: 9 },
      { size: XL, color: "Negro", swatchHex: "#171717", stock: 3 },
      { size: S, color: "Beige", swatchHex: "#D8CAB8", stock: 7 },
      { size: M, color: "Beige", swatchHex: "#D8CAB8", stock: 11 },
      { size: L, color: "Beige", swatchHex: "#D8CAB8", stock: 5 },
      { size: XL, color: "Beige", swatchHex: "#D8CAB8", stock: 0 },
    ],
  },
  {
    slug: "demo-remera-oversize-estampada",
    name: "Remera Oversize Estampada",
    categorySlug: "remeras-y-tops",
    sizeSystem: "letters",
    description:
      "Remera oversize con estampa minimalista, tela de gramaje pesado.",
    basePrice: 17500,
    cost: 7000,
    tags: ["oversize", "estampada"],
    variants: [
      { size: S, color: "Blanco", swatchHex: "#FFFFFF", stock: 9 },
      { size: M, color: "Blanco", swatchHex: "#FFFFFF", stock: 13 },
      { size: L, color: "Blanco", swatchHex: "#FFFFFF", stock: 6 },
      { size: S, color: "Gris", swatchHex: "#9CA3AF", stock: 8 },
      { size: M, color: "Gris", swatchHex: "#9CA3AF", stock: 10 },
      { size: L, color: "Gris", swatchHex: "#9CA3AF", stock: 4 },
    ],
  },
  {
    slug: "demo-pantalon-cargo",
    name: "Pantalón Cargo",
    categorySlug: "pantalones",
    sizeSystem: "numeric",
    description: "Pantalón cargo con bolsillos funcionales, tiro medio.",
    basePrice: 24000,
    cost: 10000,
    tags: ["cargo"],
    variants: [
      { size: N36, color: "Verde Oliva", swatchHex: "#6B705C", stock: 6 },
      { size: N38, color: "Verde Oliva", swatchHex: "#6B705C", stock: 10 },
      { size: N40, color: "Verde Oliva", swatchHex: "#6B705C", stock: 5 },
      { size: N36, color: "Beige", swatchHex: "#D8CAB8", stock: 4 },
      { size: N38, color: "Beige", swatchHex: "#D8CAB8", stock: 9 },
      { size: N40, color: "Beige", swatchHex: "#D8CAB8", stock: 3 },
    ],
  },
  {
    slug: "demo-jean-mom-tiro-alto",
    name: "Jean Mom Tiro Alto",
    categorySlug: "jeans",
    sizeSystem: "numeric",
    description: "Jean mom de tiro alto, silueta relajada, denim rígido.",
    basePrice: 28000,
    cost: 12000,
    tags: ["jean", "mom"],
    variants: [
      { size: N36, color: "Azul", swatchHex: "#2C3E63", stock: 5 },
      { size: N38, color: "Azul", swatchHex: "#2C3E63", stock: 12 },
      { size: N40, color: "Azul", swatchHex: "#2C3E63", stock: 9 },
      { size: N42, color: "Azul", swatchHex: "#2C3E63", stock: 0 },
      { size: N36, color: "Negro", swatchHex: "#171717", stock: 4 },
      { size: N38, color: "Negro", swatchHex: "#171717", stock: 10 },
      { size: N40, color: "Negro", swatchHex: "#171717", stock: 7 },
      { size: N42, color: "Negro", swatchHex: "#171717", stock: 3 },
    ],
  },
  {
    slug: "demo-jean-recto-clasico",
    name: "Jean Recto Clásico",
    categorySlug: "jeans",
    sizeSystem: "numeric",
    description: "Jean de corte recto clásico, lavado medio, uso diario.",
    basePrice: 26000,
    compareAtPrice: 32000,
    cost: 11000,
    isFeatured: true,
    heroRank: 3,
    tags: ["jean", "clásico"],
    variants: [
      { size: N36, color: "Azul", swatchHex: "#2C3E63", stock: 6 },
      { size: N38, color: "Azul", swatchHex: "#2C3E63", stock: 14 },
      { size: N40, color: "Azul", swatchHex: "#2C3E63", stock: 11 },
      { size: N42, color: "Azul", swatchHex: "#2C3E63", stock: 5 },
      { size: N44, color: "Azul", swatchHex: "#2C3E63", stock: 2 },
    ],
  },
  {
    slug: "demo-vestido-midi-lino",
    name: "Vestido Midi de Lino",
    categorySlug: "vestidos",
    sizeSystem: "letters",
    description: "Vestido midi de lino fresco, corte suelto, manga corta.",
    basePrice: 32000,
    cost: 14000,
    isFeatured: true,
    heroRank: 4,
    tags: ["vestido", "lino"],
    variants: [
      { size: S, color: "Blanco", swatchHex: "#FFFFFF", stock: 7 },
      { size: M, color: "Blanco", swatchHex: "#FFFFFF", stock: 11 },
      { size: L, color: "Blanco", swatchHex: "#FFFFFF", stock: 4 },
      { size: S, color: "Beige", swatchHex: "#D8CAB8", stock: 6 },
      { size: M, color: "Beige", swatchHex: "#D8CAB8", stock: 9 },
      { size: L, color: "Beige", swatchHex: "#D8CAB8", stock: 3 },
    ],
  },
  {
    slug: "demo-vestido-camisero",
    name: "Vestido Camisero",
    categorySlug: "vestidos",
    sizeSystem: "letters",
    description:
      "Vestido camisero entallado, abotonado al frente, cinturón a tono.",
    basePrice: 29500,
    compareAtPrice: 36000,
    cost: 13000,
    tags: ["vestido", "camisero"],
    variants: [
      { size: XS, color: "Negro", swatchHex: "#171717", stock: 4 },
      { size: S, color: "Negro", swatchHex: "#171717", stock: 9 },
      { size: M, color: "Negro", swatchHex: "#171717", stock: 12 },
      { size: L, color: "Negro", swatchHex: "#171717", stock: 0 },
      { size: XS, color: "Bordo", swatchHex: "#6E0B3F", stock: 3 },
      { size: S, color: "Bordo", swatchHex: "#6E0B3F", stock: 8 },
      { size: M, color: "Bordo", swatchHex: "#6E0B3F", stock: 10 },
      { size: L, color: "Bordo", swatchHex: "#6E0B3F", stock: 5 },
    ],
  },
  {
    slug: "demo-buzo-oversize-friza",
    name: "Buzo Oversize Friza",
    categorySlug: "buzos-y-camperas",
    sizeSystem: "letters",
    description:
      "Buzo oversize de friza interior, cuello redondo, puños acanalados.",
    basePrice: 26500,
    cost: 11000,
    tags: ["buzo", "oversize"],
    variants: [
      { size: S, color: "Gris", swatchHex: "#9CA3AF", stock: 8 },
      { size: M, color: "Gris", swatchHex: "#9CA3AF", stock: 13 },
      { size: L, color: "Gris", swatchHex: "#9CA3AF", stock: 10 },
      { size: XL, color: "Gris", swatchHex: "#9CA3AF", stock: 4 },
      { size: S, color: "Negro", swatchHex: "#171717", stock: 9 },
      { size: M, color: "Negro", swatchHex: "#171717", stock: 14 },
      { size: L, color: "Negro", swatchHex: "#171717", stock: 8 },
      { size: XL, color: "Negro", swatchHex: "#171717", stock: 3 },
    ],
  },
  {
    slug: "demo-campera-denim",
    name: "Campera de Denim",
    categorySlug: "buzos-y-camperas",
    sizeSystem: "letters",
    description:
      "Campera de denim clásica, botones metálicos, bolsillos al pecho.",
    basePrice: 34000,
    cost: 15000,
    tags: ["campera", "denim"],
    variants: [
      { size: S, color: "Azul", swatchHex: "#2C3E63", stock: 5 },
      { size: M, color: "Azul", swatchHex: "#2C3E63", stock: 9 },
      { size: L, color: "Azul", swatchHex: "#2C3E63", stock: 6 },
      { size: XL, color: "Azul", swatchHex: "#2C3E63", stock: 0 },
    ],
  },
  {
    slug: "demo-cinturon-cuero",
    name: "Cinturón de Cuero",
    categorySlug: "accesorios",
    sizeSystem: "one_size",
    description: "Cinturón de cuero genuino, hebilla metálica minimalista.",
    basePrice: 9500,
    cost: 4000,
    tags: ["cinturón", "cuero"],
    variants: [
      { size: UNICO, color: "Negro", swatchHex: "#171717", stock: 20 },
      { size: UNICO, color: "Camel", swatchHex: "#C19A6B", stock: 15 },
    ],
  },
  {
    slug: "demo-panuelo-seda-estampado",
    name: "Pañuelo de Seda Estampado",
    categorySlug: "accesorios",
    sizeSystem: "one_size",
    description:
      "Pañuelo de seda con estampa exclusiva, para el cuello o el bolso.",
    basePrice: 8000,
    compareAtPrice: 11000,
    cost: 3200,
    tags: ["pañuelo", "seda"],
    variants: [
      { size: UNICO, color: "Bordo", swatchHex: "#6E0B3F", stock: 12 },
      { size: UNICO, color: "Verde Oliva", swatchHex: "#6B705C", stock: 9 },
    ],
  },
];

async function upsertCategories(): Promise<Map<string, string>> {
  const idBySlug = new Map<string, string>();
  const parents = CATEGORIES.filter((c) => !c.parentSlug);
  const children = CATEGORIES.filter((c) => c.parentSlug);
  for (const cat of parents) {
    const row = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {
        name: cat.name,
        skuPrefix: cat.skuPrefix,
        order: cat.order,
        parentId: null,
        active: true,
      },
      create: {
        slug: cat.slug,
        name: cat.name,
        skuPrefix: cat.skuPrefix,
        order: cat.order,
      },
    });
    idBySlug.set(cat.slug, row.id);
  }
  for (const cat of children) {
    const parentId = idBySlug.get(cat.parentSlug!);
    if (!parentId)
      throw new Error(`Categoría padre inexistente: ${cat.parentSlug}`);
    const row = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {
        name: cat.name,
        skuPrefix: cat.skuPrefix,
        order: cat.order,
        parentId,
        active: true,
      },
      create: {
        slug: cat.slug,
        name: cat.name,
        skuPrefix: cat.skuPrefix,
        order: cat.order,
        parentId,
      },
    });
    idBySlug.set(cat.slug, row.id);
  }
  return idBySlug;
}

function prefixForSlug(slug: string): string {
  const cat = CATEGORIES.find((c) => c.slug === slug);
  if (!cat) throw new Error(`Sin skuPrefix para categoría ${slug}`);
  return cat.skuPrefix;
}

async function upsertProducts(idBySlug: Map<string, string>): Promise<void> {
  const seqByPrefix = new Map<string, number>();
  for (const p of PRODUCTS) {
    const categoryId = idBySlug.get(p.categorySlug);
    if (!categoryId)
      throw new Error(`Categoría inexistente: ${p.categorySlug}`);
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        name: p.name,
        description: p.description,
        categoryId,
        sizeSystem: p.sizeSystem,
        basePrice: p.basePrice,
        compareAtPrice: p.compareAtPrice ?? null,
        cost: p.cost,
        isFeatured: p.isFeatured ?? false,
        heroRank: p.heroRank ?? null,
        tags: p.tags ?? [],
        active: true,
        deletedAt: null,
        images: [],
      },
      create: {
        slug: p.slug,
        name: p.name,
        description: p.description,
        categoryId,
        sizeSystem: p.sizeSystem,
        basePrice: p.basePrice,
        compareAtPrice: p.compareAtPrice ?? null,
        cost: p.cost,
        isFeatured: p.isFeatured ?? false,
        heroRank: p.heroRank ?? null,
        tags: p.tags ?? [],
        images: [],
      },
    });
    const prefix = prefixForSlug(p.categorySlug);
    let order = 0;
    for (const v of p.variants) {
      const seq = (seqByPrefix.get(prefix) ?? 0) + 1;
      seqByPrefix.set(prefix, seq);
      const sku = generateSku(prefix, seq);
      const name = `${v.size} · ${v.color}`;
      const data: Prisma.ProductVariantUncheckedCreateInput = {
        productId: product.id,
        name,
        size: v.size,
        color: v.color,
        sku,
        swatchHex: v.swatchHex,
        stock: v.stock,
        active: true,
        order: order++,
      };
      await prisma.productVariant.upsert({
        where: { sku },
        update: { ...data },
        create: { ...data },
      });
    }
  }
}

async function main(): Promise<void> {
  await confirmProdWrite(
    "sembrar el catálogo de prueba (categorías y productos demo-*)",
  );
  console.log("🌱 Seeding catálogo Hazing…");
  const idBySlug = await upsertCategories();
  await upsertProducts(idBySlug);
  const [cats, prods, vars] = await Promise.all([
    prisma.category.count(),
    prisma.product.count(),
    prisma.productVariant.count(),
  ]);
  console.log(
    `✅ Seed listo: ${cats} categorías, ${prods} productos, ${vars} variantes.`,
  );
}

main()
  .catch((e) => {
    console.error("❌ Seed falló:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
