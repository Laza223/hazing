import { describe, it, expect, vi } from "vitest";
import {
  createCategory,
  updateCategory,
  deleteCategory,
  type CategoryServiceDeps,
  type CategoryCreateData,
  type CategoryUpdateData,
} from "@/lib/admin/categories/service";
import type { CategoryClean } from "@/lib/admin/categories/validation";

const cleanRoot: CategoryClean = {
  name: "Remeras",
  slug: "remeras",
  parentId: null,
  skuPrefix: "REM",
  order: 0,
  active: true,
  image: null,
  showInMenu: true,
};

function makeDeps(over: Partial<CategoryServiceDeps["db"]> = {}) {
  const db = {
    category: {
      findUnique: vi.fn(async () => null),
      findFirst: vi.fn(async () => null), // slug libre por defecto
      findMany: vi.fn(async () => []), // sin subcategorías activas por defecto
      create: vi.fn(async ({ data }: { data: CategoryCreateData }) => ({
        id: "cat-new",
        ...data,
      })),
      update: vi.fn(
        async ({
          data,
        }: {
          where: { id: string };
          data: CategoryUpdateData;
        }) => ({ id: "cat-1", ...data }),
      ),
      delete: vi.fn(async () => ({ id: "cat-1" })),
      count: vi.fn(async () => 0), // sin hijos por defecto
    },
    product: { count: vi.fn(async () => 0) }, // sin productos por defecto
    productCategory: { count: vi.fn(async () => 0) }, // sin usos como categoría adicional por defecto
    ...over,
  };
  const deps: CategoryServiceDeps = {
    db: db as unknown as CategoryServiceDeps["db"],
  };
  return { deps, db };
}

describe("createCategory", () => {
  it("crea una categoría raíz cuando el slug está libre", async () => {
    const { deps, db } = makeDeps();
    const r = await createCategory(cleanRoot, deps);
    expect(r.id).toBe("cat-new");
    expect(db.category.create).toHaveBeenCalledOnce();
    const createMock = vi.mocked(db.category.create);
    const data = createMock.mock.calls[0][0].data;
    expect(data).toMatchObject({
      slug: "remeras",
      skuPrefix: "REM",
      parentId: null,
      order: 0,
      active: true,
    });
  });

  it("rechaza slug duplicado", async () => {
    const { deps } = makeDeps({
      category: {
        findUnique: vi.fn(async () => null),
        findFirst: vi.fn(async () => ({ id: "other" })), // slug tomado
        findMany: vi.fn(async () => []),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(async () => 0),
      },
    });
    await expect(createCategory(cleanRoot, deps)).rejects.toThrow(
      "Ya existe una categoría con ese slug.",
    );
  });

  it("crea subcategoría cuando el padre es raíz", async () => {
    const child: CategoryClean = {
      ...cleanRoot,
      slug: "oversize",
      parentId: "root-1",
    };
    const { deps, db } = makeDeps({
      category: {
        findUnique: vi.fn(async () => ({ id: "root-1", parentId: null })), // padre raíz
        findFirst: vi.fn(async () => null),
        findMany: vi.fn(async () => []),
        create: vi.fn(async ({ data }: { data: CategoryCreateData }) => ({
          id: "cat-child",
          ...data,
        })),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(async () => 0),
      },
    });
    const r = await createCategory(child, deps);
    expect(r.id).toBe("cat-child");
    expect(db.category.findUnique).toHaveBeenCalledWith({
      where: { id: "root-1" },
      select: { id: true, parentId: true },
    });
  });

  it("rechaza subcategoría de un padre que ya es hijo (máx 2 niveles)", async () => {
    const child: CategoryClean = {
      ...cleanRoot,
      slug: "oversize",
      parentId: "child-1",
    };
    const { deps } = makeDeps({
      category: {
        findUnique: vi.fn(async () => ({ id: "child-1", parentId: "root-1" })), // padre ya es hijo
        findFirst: vi.fn(async () => null),
        findMany: vi.fn(async () => []),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(async () => 0),
      },
    });
    await expect(createCategory(child, deps)).rejects.toThrow(
      "Solo se permiten dos niveles",
    );
  });
});

describe("updateCategory", () => {
  it("actualiza cuando el slug sigue libre (ignora la misma fila)", async () => {
    const { deps, db } = makeDeps({
      category: {
        findUnique: vi.fn(async () => null),
        findFirst: vi.fn(async () => null), // no hay OTRA fila con ese slug
        findMany: vi.fn(async () => []),
        create: vi.fn(),
        update: vi.fn(
          async ({
            data,
          }: {
            where: { id: string };
            data: CategoryUpdateData;
          }) => ({ id: "cat-1", ...data }),
        ),
        delete: vi.fn(),
        count: vi.fn(async () => 0),
      },
    });
    const r = await updateCategory(
      "cat-1",
      { ...cleanRoot, slug: "remeras-edit" },
      deps,
    );
    expect(r.id).toBe("cat-1");
    // la búsqueda de slug excluye la propia fila
    expect(db.category.findFirst).toHaveBeenCalledWith({
      where: { slug: "remeras-edit", id: { not: "cat-1" } },
      select: { id: true },
    });
  });

  it("rechaza ponerse a sí misma como padre", async () => {
    const { deps } = makeDeps();
    await expect(
      updateCategory("cat-1", { ...cleanRoot, parentId: "cat-1" }, deps),
    ).rejects.toThrow("Una categoría no puede ser su propia categoría padre.");
  });

  it("rechaza asignarle padre a una categoría que ya tiene subcategorías (evita 3 niveles)", async () => {
    const { deps, db } = makeDeps({
      category: {
        // el padre elegido es válido (raíz)...
        findUnique: vi.fn(async () => ({ id: "root-1", parentId: null })),
        findFirst: vi.fn(async () => null),
        findMany: vi.fn(async () => []),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        // ...pero "cat-1" (la que se está editando) ya tiene hijas.
        count: vi.fn(async () => 1),
      },
    });
    await expect(
      updateCategory("cat-1", { ...cleanRoot, parentId: "root-1" }, deps),
    ).rejects.toThrow(
      "Esta categoría tiene subcategorías, así que no puede ir adentro de otra.",
    );
    expect(db.category.update).not.toHaveBeenCalled();
  });

  it("permite asignarle padre a una categoría sin subcategorías", async () => {
    const { deps, db } = makeDeps({
      category: {
        findUnique: vi.fn(async () => ({ id: "root-1", parentId: null })),
        findFirst: vi.fn(async () => null),
        findMany: vi.fn(async () => []),
        create: vi.fn(),
        update: vi.fn(
          async ({
            data,
          }: {
            where: { id: string };
            data: CategoryUpdateData;
          }) => ({ id: "cat-1", ...data }),
        ),
        delete: vi.fn(),
        count: vi.fn(async () => 0), // sin hijas
      },
    });
    const r = await updateCategory(
      "cat-1",
      { ...cleanRoot, parentId: "root-1" },
      deps,
    );
    expect(r.id).toBe("cat-1");
  });

  it("rechaza slug tomado por otra categoría", async () => {
    const { deps } = makeDeps({
      category: {
        findUnique: vi.fn(async () => null),
        findFirst: vi.fn(async () => ({ id: "other" })),
        findMany: vi.fn(async () => []),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(async () => 0),
      },
    });
    await expect(
      updateCategory("cat-1", { ...cleanRoot, slug: "tomado" }, deps),
    ).rejects.toThrow("Ya existe una categoría con ese slug.");
  });

  it("bloquea desactivar una categoría con subcategorías activas (§3.8)", async () => {
    const { deps, db } = makeDeps({
      category: {
        findUnique: vi.fn(async () => null),
        findFirst: vi.fn(async () => null),
        findMany: vi.fn(async () => [
          { name: "Oversize" },
          { name: "Básicas" },
        ]),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(async () => 0),
      },
    });
    await expect(
      updateCategory("cat-1", { ...cleanRoot, active: false }, deps),
    ).rejects.toThrow(
      "Primero desactivá sus subcategorías: Oversize, Básicas.",
    );
    expect(db.category.update).not.toHaveBeenCalled();
  });

  it("permite desactivar cuando no tiene subcategorías activas", async () => {
    const { deps, db } = makeDeps({
      category: {
        findUnique: vi.fn(async () => null),
        findFirst: vi.fn(async () => null),
        findMany: vi.fn(async () => []), // ninguna activa
        create: vi.fn(),
        update: vi.fn(
          async ({
            data,
          }: {
            where: { id: string };
            data: CategoryUpdateData;
          }) => ({ id: "cat-1", ...data }),
        ),
        delete: vi.fn(),
        count: vi.fn(async () => 0),
      },
    });
    const r = await updateCategory(
      "cat-1",
      { ...cleanRoot, active: false },
      deps,
    );
    expect(r.id).toBe("cat-1");
    expect(db.category.update).toHaveBeenCalledOnce();
  });

  it("no chequea subcategorías activas cuando la categoría queda activa", async () => {
    const { deps, db } = makeDeps();
    await updateCategory("cat-1", { ...cleanRoot, active: true }, deps);
    expect(db.category.findMany).not.toHaveBeenCalled();
  });
});

describe("deleteCategory", () => {
  it("borra cuando no tiene productos ni hijos", async () => {
    const { deps, db } = makeDeps();
    await deleteCategory("cat-1", deps);
    expect(db.category.delete).toHaveBeenCalledWith({ where: { id: "cat-1" } });
  });

  it("bloquea el borrado si tiene productos", async () => {
    const { deps } = makeDeps({ product: { count: vi.fn(async () => 3) } });
    await expect(deleteCategory("cat-1", deps)).rejects.toThrow(
      "No se puede borrar: la categoría tiene productos.",
    );
  });

  it("bloquea el borrado si está asignada como categoría adicional de algún producto", async () => {
    const { deps } = makeDeps({
      productCategory: { count: vi.fn(async () => 2) },
    });
    await expect(deleteCategory("cat-1", deps)).rejects.toThrow(
      "No se puede borrar: hay productos que la tienen como categoría adicional.",
    );
  });

  it("permite borrar cuando los únicos productos están soft-deleted", async () => {
    const { deps, db } = makeDeps({ product: { count: vi.fn(async () => 0) } });
    await deleteCategory("cat-1", deps);
    expect(db.category.delete).toHaveBeenCalledWith({ where: { id: "cat-1" } });
    expect(db.product.count).toHaveBeenCalledWith({
      where: { categoryId: "cat-1", deletedAt: null },
    });
  });

  it("bloquea el borrado si tiene subcategorías", async () => {
    const { deps } = makeDeps({
      category: {
        findUnique: vi.fn(async () => null),
        findFirst: vi.fn(async () => null),
        findMany: vi.fn(async () => []),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(async () => 2), // tiene hijos
      },
    });
    await expect(deleteCategory("cat-1", deps)).rejects.toThrow(
      "No se puede borrar: la categoría tiene subcategorías.",
    );
  });
});
