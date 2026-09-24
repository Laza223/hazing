import { describe, it, expect } from "vitest";
import {
  buildCategoryTree,
  findCategoryByPath,
  buildBreadcrumbs,
  filterVisibleInNav,
} from "@/lib/catalog/categories";

const flat = [
  { id: "remeras", slug: "remeras", name: "Remeras", parentId: null, order: 0 },
  {
    id: "oversize",
    slug: "oversize",
    name: "Oversize",
    parentId: "remeras",
    order: 1,
  },
  {
    id: "basicas",
    slug: "basicas",
    name: "Básicas",
    parentId: "remeras",
    order: 0,
  },
  {
    id: "vestidos",
    slug: "vestidos",
    name: "Vestidos",
    parentId: null,
    order: 1,
  },
  {
    id: "oculta",
    slug: "oculta",
    name: "Oculta",
    parentId: null,
    order: 2,
    active: false,
  },
];

describe("buildCategoryTree", () => {
  it("arma raíces ordenadas con hijos ordenados, excluye inactivas", () => {
    const tree = buildCategoryTree(flat);
    expect(tree.map((c) => c.slug)).toEqual(["remeras", "vestidos"]);
    const remeras = tree[0];
    expect(remeras.children.map((c) => c.slug)).toEqual([
      "basicas",
      "oversize",
    ]); // order 0 antes que 1
  });
});

describe("filterVisibleInNav", () => {
  it("sin showInMenu (undefined) se trata como visible", () => {
    const tree = buildCategoryTree(flat);
    expect(filterVisibleInNav(tree).map((c) => c.slug)).toEqual([
      "remeras",
      "vestidos",
    ]);
  });
  it("excluye las raíces con showInMenu: false, conserva las que sí se muestran", () => {
    const flatWithHidden = [
      ...flat,
      {
        id: "ofertas",
        slug: "ofertas",
        name: "Ofertas",
        parentId: null,
        order: 3,
        showInMenu: false,
      },
    ];
    const tree = buildCategoryTree(flatWithHidden);
    const visible = filterVisibleInNav(tree);
    expect(visible.map((c) => c.slug)).toEqual(["remeras", "vestidos"]);
    expect(
      visible.find((c) => c.slug === "remeras")?.children.map((c) => c.slug),
    ).toEqual(["basicas", "oversize"]);
  });
  it("excluye también subcategorías con showInMenu: false (no solo raíces)", () => {
    const flatWithHiddenChild = flat.map((c) =>
      c.slug === "oversize" ? { ...c, showInMenu: false } : c,
    );
    const tree = buildCategoryTree(flatWithHiddenChild);
    const visible = filterVisibleInNav(tree);
    const remeras = visible.find((c) => c.slug === "remeras");
    expect(remeras?.children.map((c) => c.slug)).toEqual(["basicas"]);
  });
});

describe("findCategoryByPath", () => {
  const tree = buildCategoryTree(flat);
  it("categoría padre → incluye sus ids + hijos", () => {
    const r = findCategoryByPath(tree, "remeras");
    expect(r?.category.slug).toBe("remeras");
    expect(r?.subcategory).toBeUndefined();
    expect(new Set(r?.categoryIds)).toEqual(
      new Set(["remeras", "basicas", "oversize"]),
    );
  });
  it("subcategoría → solo su id", () => {
    const r = findCategoryByPath(tree, "remeras", "oversize");
    expect(r?.subcategory?.slug).toBe("oversize");
    expect(r?.categoryIds).toEqual(["oversize"]);
  });
  it("rutas inexistentes → null", () => {
    expect(findCategoryByPath(tree, "nope")).toBeNull();
    expect(findCategoryByPath(tree, "remeras", "nope")).toBeNull();
  });
});

describe("buildBreadcrumbs", () => {
  const tree = buildCategoryTree(flat);
  const remeras = tree[0];
  const oversize = remeras.children.find((c) => c.slug === "oversize")!;
  it("inicio/tienda/categoria/subcategoria/producto con current correcto", () => {
    const crumbs = buildBreadcrumbs({
      category: remeras,
      subcategory: oversize,
      product: { name: "Remera X", slug: "remera-x" },
    });
    expect(crumbs.map((c) => c.label)).toEqual([
      "Inicio",
      "Tienda",
      "Remeras",
      "Oversize",
      "Remera X",
    ]);
    expect(crumbs.at(-1)).toMatchObject({
      current: true,
      href: "/producto/remera-x",
    });
  });
  it("sin producto marca current la última categoría", () => {
    const crumbs = buildBreadcrumbs({ category: remeras });
    expect(crumbs.at(-1)).toMatchObject({ label: "Remeras", current: true });
  });
});
