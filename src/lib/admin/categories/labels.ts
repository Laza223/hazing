interface CategoryRow {
  id: string;
  name: string;
  parentId: string | null;
}

/**
 * Opciones de categoría para los selects del admin: las hijas llevan el nombre
 * de su raíz ("Essentials › Tops") para distinguir las que se llaman igual, y
 * quedan agrupadas debajo de su raíz. Conserva el orden de entrada.
 */
export function labelCategories(
  rows: CategoryRow[],
): { id: string; name: string }[] {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const isChild = (r: CategoryRow) =>
    r.parentId !== null && byId.has(r.parentId);
  const out: { id: string; name: string }[] = [];
  for (const root of rows.filter((r) => !isChild(r))) {
    out.push({ id: root.id, name: root.name });
    for (const child of rows.filter((r) => r.parentId === root.id)) {
      out.push({ id: child.id, name: `${root.name} › ${child.name}` });
    }
  }
  return out;
}
