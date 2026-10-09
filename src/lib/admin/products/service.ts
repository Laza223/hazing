import { prisma } from "@/lib/prisma";
import { generateSku } from "@/lib/sku";
import { nextSkuSequence } from "@/lib/admin/sku";
import type {
  ProductClean,
  VariantClean,
} from "@/lib/admin/products/validation";

/** Fila mínima de variante existente, usada para diffear contra el form. */
export interface ExistingVariantRow {
  id: string;
  size: string;
  color: string;
  sku: string;
}

/** Superficie mínima del cliente transaccional usada dentro de `$transaction`. */
export interface ProductTx {
  productVariant: {
    findMany(args: {
      where: { sku: { startsWith: string } };
      select: { sku: true };
    }): Promise<Array<{ sku: string }>>;
    findMany(args: {
      where: { productId: string };
      select: { id: true; size: true; color: true; sku: true };
    }): Promise<ExistingVariantRow[]>;
    create: (args: {
      data: Record<string, unknown>;
    }) => Promise<{ id: string }>;
    update: (args: {
      where: { id: string };
      data: Record<string, unknown>;
    }) => Promise<{ id: string }>;
    deleteMany: (args: {
      where: { id: { in: string[] } };
    }) => Promise<{ count: number }>;
  };
  product: {
    create: (args: {
      data: Record<string, unknown>;
    }) => Promise<{ id: string }>;
    update: (args: {
      where: { id: string };
      data: Record<string, unknown>;
    }) => Promise<{ id: string }>;
  };
  productCategory: {
    deleteMany: (args: {
      where: { productId: string };
    }) => Promise<{ count: number }>;
    createMany: (args: {
      data: Array<{ productId: string; categoryId: string }>;
    }) => Promise<{ count: number }>;
  };
  /** Referencias a variantes — solo se leen para decidir si una variante que sale de la
   *  grilla se puede borrar o hay que desactivarla (FK requerida sin `onDelete`, ver
   *  docs/spec/07-admin.md hallazgo "Variantes referenciadas"). */
  cartItem: {
    findMany: (args: {
      where: { variantId: { in: string[] } };
      select: { variantId: true };
      distinct: ["variantId"];
    }) => Promise<Array<{ variantId: string }>>;
  };
  orderItem: {
    findMany: (args: {
      where: { variantId: { in: string[] } };
      select: { variantId: true };
      distinct: ["variantId"];
    }) => Promise<Array<{ variantId: string | null }>>;
  };
}

/** Superficie mínima de Prisma usada por el servicio (para inyectar fakes en tests). */
export interface ProductDb {
  category: {
    findUnique: (args: {
      where: { id: string };
      select: { skuPrefix: true };
    }) => Promise<{ skuPrefix: string } | null>;
  };
  product: {
    findFirst: (args: {
      where: { slug: string; id?: { not: string }; deletedAt?: null };
    }) => Promise<{ id: string } | null>;
    update: (args: {
      where: { id: string };
      data: Record<string, unknown>;
    }) => Promise<{ id: string }>;
  };
  $transaction: <T>(fn: (tx: ProductTx) => Promise<T>) => Promise<T>;
}
export interface CreateProductDeps {
  db: ProductDb;
  now?: Date;
}

export function defaultProductDeps(): CreateProductDeps {
  return { db: prisma as unknown as ProductDb };
}

/** Detecta el error de violación de unicidad de Prisma (P2002) sin usar `any`. */
function isUniqueViolation(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code?: unknown }).code === "P2002"
  );
}

interface VariantCreateData {
  name: string;
  size: string;
  color: string;
  swatchHex: string | null;
  sku: string;
  priceOverride: number | null;
  stock: number;
  lowStockThreshold: number;
  image: string | null;
  active: boolean;
  order: number;
}

/**
 * Asigna SKU a cada variante: las que ya tienen un id de fila existente (o se
 * reactivan sobre una fila desactivada) conservan su SKU actual; el resto —
 * variantes genuinamente nuevas — SIEMPRE se autogenera, ignorando cualquier
 * SKU que haya mandado el cliente (docs/spec/07-admin.md §3.6: no es un campo
 * editable). El `name` se deriva acá como "{size} · {color}" (ADR 0001).
 */
function assignSkus(
  variants: VariantClean[],
  prefix: string,
  startSeq: number,
): VariantCreateData[] {
  let seq = startSeq;
  return variants.map((v) => {
    // Solo una fila que YA existe en DB (id propio o reactivada sobre una desactivada,
    // ver `resolveReactivations`) puede conservar su SKU; una fila nueva siempre autogenera.
    const sku =
      v.id != null && v.sku !== "" ? v.sku : generateSku(prefix, seq++);
    return {
      name: `${v.size} · ${v.color}`,
      size: v.size,
      color: v.color,
      swatchHex: v.swatchHex,
      sku,
      priceOverride: v.priceOverride,
      stock: v.stock,
      lowStockThreshold: v.lowStockThreshold,
      image: v.image,
      active: v.active,
      order: v.order,
    };
  });
}

async function resolvePrefix(
  db: ProductDb,
  categoryId: string,
): Promise<string> {
  const cat = await db.category.findUnique({
    where: { id: categoryId },
    select: { skuPrefix: true },
  });
  if (!cat) throw new Error("La categoría elegida no existe.");
  return cat.skuPrefix;
}

/** Campos escalares del producto (sin variantes) — usado tal cual para `update` (las variantes se
 *  diffean aparte) y con `variants: {create}` agregado para el `create` inicial. */
function productScalarData(input: ProductClean): Record<string, unknown> {
  return {
    slug: input.slug,
    name: input.name,
    description: input.description,
    categoryId: input.categoryId,
    sizeSystem: input.sizeSystem,
    basePrice: input.basePrice,
    compareAtPrice: input.compareAtPrice,
    cost: input.cost,
    images: input.images,
    isFeatured: input.isFeatured,
    heroRank: input.heroRank,
    tags: input.tags,
    seoTitle: input.seoTitle,
    seoDescription: input.seoDescription,
    active: input.active,
  };
}

function productData(
  input: ProductClean,
  variantRows: VariantCreateData[],
): Record<string, unknown> {
  return { ...productScalarData(input), variants: { create: variantRows } };
}

function variantKey(size: string, color: string): string {
  return `${size}::${color}`;
}

/**
 * Resuelve, para cada variante del form sin `id` (nueva desde la perspectiva de Dana), si
 * coincide en (size, color) con una fila que ya existe en DB para este producto — activa o
 * desactivada. Si coincide, la "reactiva": conserva su id y su SKU en vez de crear una fila
 * nueva (si no, choca el `@@unique([productId, size, color])` al reactivar una desactivada).
 */
function resolveReactivations(
  variants: VariantClean[],
  existingRows: ExistingVariantRow[],
  incomingIds: Set<string>,
): VariantClean[] {
  const byKey = new Map(
    existingRows.map((r) => [variantKey(r.size, r.color), r]),
  );
  const claimed = new Set(incomingIds);
  return variants.map((v) => {
    if (v.id != null) return v;
    const match = byKey.get(variantKey(v.size, v.color));
    if (!match || claimed.has(match.id)) return v;
    claimed.add(match.id);
    return { ...v, id: match.id, sku: match.sku };
  });
}

/**
 * De las variantes que salen de la grilla (destildadas), separa las que tienen referencias
 * (`CartItem`/`OrderItem`, FK requerida sin `onDelete` → Restrict) de las que no. Las
 * referenciadas se desactivan (stock 0) en vez de borrarse — si no, `deleteMany` tira el error
 * crudo de Prisma y aborta todo el guardado (docs/spec/07-admin.md hallazgo "Variantes referenciadas").
 */
async function splitStaleByReferences(
  tx: ProductTx,
  staleIds: string[],
): Promise<{ deleteIds: string[]; deactivateIds: string[] }> {
  if (staleIds.length === 0) return { deleteIds: [], deactivateIds: [] };
  const [cartRefs, orderRefs] = await Promise.all([
    tx.cartItem.findMany({
      where: { variantId: { in: staleIds } },
      select: { variantId: true },
      distinct: ["variantId"],
    }),
    tx.orderItem.findMany({
      where: { variantId: { in: staleIds } },
      select: { variantId: true },
      distinct: ["variantId"],
    }),
  ]);
  const referenced = new Set<string>();
  for (const r of cartRefs) referenced.add(r.variantId);
  for (const r of orderRefs) if (r.variantId) referenced.add(r.variantId);
  return {
    deleteIds: staleIds.filter((vid) => !referenced.has(vid)),
    deactivateIds: staleIds.filter((vid) => referenced.has(vid)),
  };
}

/** Rehace las categorías adicionales del producto (tabla de asociación pura, sin historia que preservar). */
async function syncExtraCategories(
  tx: ProductTx,
  productId: string,
  extraCategoryIds: string[],
): Promise<void> {
  await tx.productCategory.deleteMany({ where: { productId } });
  if (extraCategoryIds.length > 0) {
    await tx.productCategory.createMany({
      data: extraCategoryIds.map((categoryId) => ({ productId, categoryId })),
    });
  }
}

export async function createProduct(
  input: ProductClean,
  deps: CreateProductDeps,
): Promise<{ id: string }> {
  const existing = await deps.db.product.findFirst({
    where: { slug: input.slug, deletedAt: null },
  });
  if (existing)
    throw new Error(
      `Ya existe un producto con el enlace "${input.slug}". Cambiá el slug.`,
    );

  const prefix = await resolvePrefix(deps.db, input.categoryId);

  const attempt = async (): Promise<{ id: string }> => {
    return deps.db.$transaction(async (tx) => {
      const rows = await tx.productVariant.findMany({
        where: { sku: { startsWith: `${prefix}-` } },
        select: { sku: true },
      });
      const startSeq = nextSkuSequence(rows.map((r) => r.sku));
      const variantRows = assignSkus(input.variants, prefix, startSeq);
      const created = await tx.product.create({
        data: productData(input, variantRows),
      });
      await syncExtraCategories(tx, created.id, input.extraCategoryIds);
      return { id: created.id };
    });
  };

  try {
    return await attempt();
  } catch (e) {
    if (isUniqueViolation(e)) return attempt();
    throw e;
  }
}

export async function updateProduct(
  id: string,
  input: ProductClean,
  deps: CreateProductDeps,
): Promise<{ id: string }> {
  const clash = await deps.db.product.findFirst({
    where: { slug: input.slug, id: { not: id }, deletedAt: null },
  });
  if (clash)
    throw new Error(
      `Ya existe otro producto con el enlace "${input.slug}". Cambiá el slug.`,
    );

  const prefix = await resolvePrefix(deps.db, input.categoryId);

  const attempt = async (): Promise<{ id: string }> => {
    return deps.db.$transaction(async (tx) => {
      // Diff real de variantes (nunca borrar-y-recrear todo): las que el form manda con `id` de una
      // fila existente se actualizan in-place (conservan su SKU); las que no traen id pero coinciden
      // en (talle, color) con una fila desactivada se reactivan (conservan id y SKU); las
      // genuinamente nuevas se crean; las que ya no vienen (talle/color destildado) se borran si no
      // tienen referencias, o se desactivan si las tienen (ver `splitStaleByReferences`).
      const existing = await tx.productVariant.findMany({
        where: { productId: id },
        select: { id: true, size: true, color: true, sku: true },
      });
      const existingIds = new Set(existing.map((v) => v.id));
      const incomingIds = new Set(
        input.variants.filter((v) => v.id != null).map((v) => v.id as string),
      );
      const resolvedVariants = resolveReactivations(
        input.variants,
        existing,
        incomingIds,
      );
      const resolvedIncomingIds = new Set(
        resolvedVariants.filter((v) => v.id != null).map((v) => v.id as string),
      );
      const staleIds = [...existingIds].filter(
        (vid) => !resolvedIncomingIds.has(vid),
      );
      const { deleteIds, deactivateIds } = await splitStaleByReferences(
        tx,
        staleIds,
      );

      const rows = await tx.productVariant.findMany({
        where: { sku: { startsWith: `${prefix}-` } },
        select: { sku: true },
      });
      const startSeq = nextSkuSequence(rows.map((r) => r.sku));
      const variantRows = assignSkus(resolvedVariants, prefix, startSeq);

      const updated = await tx.product.update({
        where: { id },
        data: productScalarData(input),
      });

      for (let i = 0; i < resolvedVariants.length; i++) {
        const v = resolvedVariants[i];
        const row = variantRows[i];
        if (v.id != null && existingIds.has(v.id)) {
          // Con `baseStock` (stock al abrir el form) se aplica solo la diferencia, así las ventas
          // ocurridas mientras se editaba no se pierden; sin cambio, no se toca el stock.
          // Sin `baseStock` (fila reactivada o cliente viejo) se mantiene el set absoluto.
          const { stock, ...rest } = row;
          const stockData =
            v.baseStock == null
              ? { stock }
              : stock === v.baseStock
                ? {}
                : { stock: { increment: stock - v.baseStock } };
          await tx.productVariant.update({
            where: { id: v.id },
            data: { ...rest, ...stockData },
          });
        } else {
          await tx.productVariant.create({ data: { ...row, productId: id } });
        }
      }
      for (const vid of deactivateIds) {
        await tx.productVariant.update({
          where: { id: vid },
          data: { active: false, stock: 0 },
        });
      }
      if (deleteIds.length > 0) {
        await tx.productVariant.deleteMany({
          where: { id: { in: deleteIds } },
        });
      }
      await syncExtraCategories(tx, id, input.extraCategoryIds);

      return { id: updated.id };
    });
  };

  try {
    return await attempt();
  } catch (e) {
    if (isUniqueViolation(e)) return attempt();
    throw e;
  }
}

export async function softDeleteProduct(
  id: string,
  deps: CreateProductDeps,
): Promise<{ id: string }> {
  const now = deps.now ?? new Date();
  await deps.db.product.update({
    where: { id },
    data: { deletedAt: now, active: false },
  });
  return { id };
}
