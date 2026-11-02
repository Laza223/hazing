import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/catalog/pricing";

/** Los precios se redondean al $100 más cercano (decisión de la dueña). */
const ROUND_TO = 100;
const MIN_PERCENT = 0.1;
const MAX_PERCENT = 100;

export interface PriceIncreaseInput {
  percent: number;
  /** Categoría primaria (`Product.categoryId`) más sus hijas, como la tienda; sin valor = todo. */
  categoryId?: string | null;
}

export type PercentCheck = { ok: true } | { ok: false; error: string };

export function validatePercent(percent: number): PercentCheck {
  if (
    !Number.isFinite(percent) ||
    percent < MIN_PERCENT ||
    percent > MAX_PERCENT
  ) {
    return {
      ok: false,
      error: `Ingresá un porcentaje entre 0,1 y ${MAX_PERCENT}.`,
    };
  }
  return { ok: true };
}

/**
 * Precio nuevo = round(precio × (1 + %/100) / 100) × 100, con Decimal (half-up), y nunca
 * menor al actual (un precio chico no pasa a $0 ni "subir" lo baja). Tiene que coincidir
 * con el `ROUND`/`GREATEST` de Postgres de `applyPriceIncrease`.
 */
export function increasePrice(value: number, percent: number): number {
  const rounded = new Prisma.Decimal(value)
    .times(new Prisma.Decimal(percent).div(100).plus(1))
    .div(ROUND_TO)
    .toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP)
    .times(ROUND_TO)
    .toNumber();
  return Math.max(rounded, value);
}

type ProductScope = { deletedAt: null; categoryId?: { in: string[] } };

export interface BulkPriceDb {
  $executeRaw: (query: Prisma.Sql) => Promise<number>;
  $transaction: <T>(queries: Array<Promise<T>>) => Promise<T[]>;
  category: {
    findMany: (args: {
      where: { parentId: string };
      select: { id: true };
    }) => Promise<Array<{ id: string }>>;
  };
  product: {
    count: (args: { where: ProductScope }) => Promise<number>;
    findFirst: (args: {
      where: ProductScope;
      orderBy: { basePrice: "desc" };
      select: { basePrice: true };
    }) => Promise<{ basePrice: Prisma.Decimal } | null>;
  };
}

export interface BulkPriceDeps {
  db: BulkPriceDb;
}

export function defaultBulkPriceDeps(): BulkPriceDeps {
  return { db: prisma as unknown as BulkPriceDb };
}

/** Ids de la categoría elegida + sus hijas (hasta 2 niveles); null = todo el catálogo. */
async function categoryScope(
  db: BulkPriceDb,
  categoryId?: string | null,
): Promise<string[] | null> {
  if (!categoryId) return null;
  const children = await db.category.findMany({
    where: { parentId: categoryId },
    select: { id: true },
  });
  return [categoryId, ...children.map((c) => c.id)];
}

export interface PriceIncreasePreview {
  products: number;
  /** Ejemplo con el producto más caro: precio actual → precio nuevo. */
  example: { from: number; to: number } | null;
}

export async function previewPriceIncrease(
  input: PriceIncreaseInput,
  deps: BulkPriceDeps = defaultBulkPriceDeps(),
): Promise<PriceIncreasePreview> {
  const check = validatePercent(input.percent);
  if (!check.ok) throw new Error(check.error);
  const ids = await categoryScope(deps.db, input.categoryId);
  const where: ProductScope = {
    deletedAt: null,
    ...(ids ? { categoryId: { in: ids } } : {}),
  };
  const [products, top] = await Promise.all([
    deps.db.product.count({ where }),
    deps.db.product.findFirst({
      where,
      orderBy: { basePrice: "desc" },
      select: { basePrice: true },
    }),
  ]);
  const from = top ? toNumber(top.basePrice) : null;
  return {
    products,
    example:
      from === null ? null : { from, to: increasePrice(from, input.percent) },
  };
}

/**
 * Sube `basePrice`, `compareAtPrice` y `ProductVariant.priceOverride` el mismo %.
 * `cost` no se toca. Un solo `$transaction` de dos UPDATE en SQL: atómico y sin el timeout
 * de transacciones interactivas con cientos de filas. Si tras redondear el precio "antes"
 * queda <= al precio, se anula (sino la ficha mostraría una oferta inválida).
 */
export async function applyPriceIncrease(
  input: PriceIncreaseInput,
  deps: BulkPriceDeps = defaultBulkPriceDeps(),
): Promise<{ products: number }> {
  const check = validatePercent(input.percent);
  if (!check.ok) throw new Error(check.error);

  const ids = await categoryScope(deps.db, input.categoryId);
  const factor = Prisma.sql`(1 + ${input.percent}::numeric / 100)`;
  const round = (col: Prisma.Sql) =>
    Prisma.sql`GREATEST(ROUND(${col} * ${factor} / ${ROUND_TO}) * ${ROUND_TO}, ${col})`;
  const scope = (col: Prisma.Sql) =>
    ids ? Prisma.sql`${col} = ANY(${ids}::uuid[])` : Prisma.sql`TRUE`;

  const [products] = await deps.db.$transaction([
    deps.db.$executeRaw(Prisma.sql`
      UPDATE "Product" SET
        "compareAtPrice" = CASE
          WHEN "compareAtPrice" IS NULL THEN NULL
          WHEN ${round(Prisma.sql`"compareAtPrice"`)} > ${round(Prisma.sql`"basePrice"`)}
            THEN ${round(Prisma.sql`"compareAtPrice"`)}
          ELSE NULL
        END,
        "basePrice" = ${round(Prisma.sql`"basePrice"`)},
        "updatedAt" = now()
      WHERE "deletedAt" IS NULL AND ${scope(Prisma.sql`"categoryId"`)}
    `),
    deps.db.$executeRaw(Prisma.sql`
      UPDATE "ProductVariant" v SET "priceOverride" = ${round(Prisma.sql`v."priceOverride"`)}
      FROM "Product" p
      WHERE p."id" = v."productId" AND v."priceOverride" IS NOT NULL
        AND p."deletedAt" IS NULL AND ${scope(Prisma.sql`p."categoryId"`)}
    `),
  ]);
  return { products };
}
