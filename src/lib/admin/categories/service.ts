import { prisma } from "@/lib/prisma";
import {
  assertMaxTwoLevels,
  type CategoryClean,
} from "@/lib/admin/categories/validation";

/** Superficie mínima de Prisma que usa el servicio (para inyectar fakes en tests). */
export interface CategoryDb {
  category: {
    findUnique: (args: {
      where: { id: string };
      select: { id: true; parentId: true };
    }) => Promise<{ id: string; parentId: string | null } | null>;
    findFirst: (args: {
      where: { slug: string; id?: { not: string } };
      select: { id: true };
    }) => Promise<{ id: string } | null>;
    findMany: (args: {
      where: { parentId: string; active: true };
      select: { name: true };
    }) => Promise<Array<{ name: string }>>;
    create: (args: { data: CategoryCreateData }) => Promise<{ id: string }>;
    update: (args: {
      where: { id: string };
      data: CategoryUpdateData;
    }) => Promise<{ id: string }>;
    delete: (args: { where: { id: string } }) => Promise<{ id: string }>;
    count: (args: { where: { parentId: string } }) => Promise<number>;
  };
  product: {
    count: (args: {
      where: { categoryId: string; deletedAt?: null };
    }) => Promise<number>;
  };
  productCategory: {
    count: (args: {
      where: { categoryId: string; product: { deletedAt: null } };
    }) => Promise<number>;
  };
}

export interface CategoryCreateData {
  name: string;
  slug: string;
  parentId: string | null;
  skuPrefix: string;
  order: number;
  active: boolean;
  image: string | null;
  showInMenu: boolean;
}
export type CategoryUpdateData = CategoryCreateData;

export interface CategoryServiceDeps {
  db: CategoryDb;
}

export function defaultCategoryDeps(): CategoryServiceDeps {
  return { db: prisma as unknown as CategoryDb };
}

/** Chequea unicidad de slug; `exceptId` excluye la propia fila al editar. */
async function ensureSlugFree(
  db: CategoryDb,
  slug: string,
  exceptId?: string,
): Promise<void> {
  const where = exceptId ? { slug, id: { not: exceptId } } : { slug };
  const hit = await db.category.findFirst({ where, select: { id: true } });
  if (hit) throw new Error("Ya existe una categoría con ese slug.");
}

/** Verifica que el padre exista y sea raíz (máx 2 niveles). */
async function ensureValidParent(
  db: CategoryDb,
  parentId: string,
): Promise<void> {
  const parent = await db.category.findUnique({
    where: { id: parentId },
    select: { id: true, parentId: true },
  });
  const check = assertMaxTwoLevels(parent);
  if (!check.ok) throw new Error(check.error);
}

/**
 * Decisión §3.8 (docs/spec/07-admin.md): impedir desactivar una categoría que tiene
 * subcategorías activas, en vez de apagarlas en cascada sin que Dana lo vea. El mensaje
 * nombra las subcategorías para que sepa exactamente qué apagar primero.
 */
/**
 * Decisión (hallazgo "Tercer nivel de categorías"): asignarle un padre a una categoría que ya
 * tiene hijas (en cualquier estado) crearía un tercer nivel — se rechaza antes de tocar la DB.
 */
async function ensureNoChildren(db: CategoryDb, id: string): Promise<void> {
  const count = await db.category.count({ where: { parentId: id } });
  if (count > 0) {
    throw new Error(
      "Esta categoría tiene subcategorías, así que no puede ir adentro de otra.",
    );
  }
}

async function ensureNoActiveChildren(
  db: CategoryDb,
  id: string,
): Promise<void> {
  const activeChildren = await db.category.findMany({
    where: { parentId: id, active: true },
    select: { name: true },
  });
  if (activeChildren.length > 0) {
    const names = activeChildren.map((c) => c.name).join(", ");
    throw new Error(`Primero desactivá sus subcategorías: ${names}.`);
  }
}

function toData(input: CategoryClean): CategoryCreateData {
  return {
    name: input.name,
    slug: input.slug,
    parentId: input.parentId,
    skuPrefix: input.skuPrefix,
    order: input.order,
    active: input.active,
    image: input.image,
    showInMenu: input.showInMenu,
  };
}

export async function createCategory(
  input: CategoryClean,
  deps: CategoryServiceDeps,
): Promise<{ id: string }> {
  await ensureSlugFree(deps.db, input.slug);
  if (input.parentId) await ensureValidParent(deps.db, input.parentId);
  const created = await deps.db.category.create({ data: toData(input) });
  return { id: created.id };
}

export async function updateCategory(
  id: string,
  input: CategoryClean,
  deps: CategoryServiceDeps,
): Promise<{ id: string }> {
  if (input.parentId === id) {
    throw new Error("Una categoría no puede ser su propia categoría padre.");
  }
  await ensureSlugFree(deps.db, input.slug, id);
  if (input.parentId) {
    await ensureValidParent(deps.db, input.parentId);
    await ensureNoChildren(deps.db, id);
  }
  if (!input.active) await ensureNoActiveChildren(deps.db, id);
  const updated = await deps.db.category.update({
    where: { id },
    data: toData(input),
  });
  return { id: updated.id };
}

export async function deleteCategory(
  id: string,
  deps: CategoryServiceDeps,
): Promise<void> {
  const products = await deps.db.product.count({
    where: { categoryId: id, deletedAt: null },
  });
  if (products > 0)
    throw new Error("No se puede borrar: la categoría tiene productos.");
  const productLinks = await deps.db.productCategory.count({
    where: { categoryId: id, product: { deletedAt: null } },
  });
  if (productLinks > 0) {
    throw new Error(
      "No se puede borrar: hay productos que la tienen como categoría adicional.",
    );
  }
  const children = await deps.db.category.count({ where: { parentId: id } });
  if (children > 0)
    throw new Error("No se puede borrar: la categoría tiene subcategorías.");
  await deps.db.category.delete({ where: { id } });
}
