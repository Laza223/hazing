import { requireAdmin } from "@/lib/admin/auth";
import Link from "next/link";
import {
  Plus,
  FolderTree,
  CircleCheck,
  EyeOff,
  CornerDownRight,
  Folder,
  MenuSquare,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/admin/page-header";

export const dynamic = "force-dynamic";

interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  skuPrefix: string;
  order: number;
  active: boolean;
  showInMenu: boolean;
  parentId: string | null;
  productCount: number;
}

async function loadCategories(): Promise<CategoryNode[]> {
  const rows = await prisma.category.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      skuPrefix: true,
      order: true,
      active: true,
      showInMenu: true,
      parentId: true,
      _count: { select: { products: true, productLinks: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    skuPrefix: r.skuPrefix,
    order: r.order,
    active: r.active,
    showInMenu: r.showInMenu,
    parentId: r.parentId,
    // Primaria + adicional: un producto nunca cuenta dos veces (la validación excluye la
    // primaria de las adicionales).
    productCount: r._count.products + r._count.productLinks,
  }));
}

export default async function CategoriasPage() {
  await requireAdmin();
  const all = await loadCategories();
  const roots = all.filter((c) => c.parentId === null);
  const childrenOf = (id: string) => all.filter((c) => c.parentId === id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categorías"
        subtitle="Organizá tus productos en categorías y subcategorías (hasta dos niveles)."
        action={
          <Link className={cn(buttonVariants())} href="/admin/categorias/nuevo">
            <Plus className="size-4" aria-hidden /> Nueva categoría
          </Link>
        }
      />

      {all.length === 0 ? (
        <div className="rounded-control border border-dashed border-line p-12 text-center">
          <FolderTree className="mx-auto size-8 text-ink-4" aria-hidden />
          <p className="mt-4 text-base font-medium text-ink">
            Todavía no hay categorías
          </p>
          <p className="mt-1 text-sm text-ink-3">
            Creá tu primera categoría (por ejemplo, &ldquo;Remeras&rdquo;) para
            empezar a cargar productos.
          </p>
          <Link
            className={cn(buttonVariants(), "mt-5")}
            href="/admin/categorias/nuevo"
          >
            <Plus className="size-4" aria-hidden /> Crear la primera
          </Link>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Prefijo</TableHead>
              <TableHead className="text-right">Productos</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roots.flatMap((root) => {
              const kids = childrenOf(root.id);
              const rootRow = (
                <TableRow key={root.id}>
                  <TableCell>
                    <span className="flex items-center gap-2.5">
                      <Folder className="size-4 text-ink-3" aria-hidden />
                      <span className="font-medium text-ink">{root.name}</span>
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="rounded-control border border-line px-2 py-0.5 font-mono text-xs text-ink-3">
                      {root.skuPrefix}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {root.productCount}
                  </TableCell>
                  <TableCell>
                    <span className="flex flex-wrap items-center gap-1.5">
                      {root.active ? (
                        <Badge className="gap-1">
                          <CircleCheck className="size-3" aria-hidden /> Activa
                        </Badge>
                      ) : (
                        <Badge className="gap-1">
                          <EyeOff className="size-3" aria-hidden /> Inactiva
                        </Badge>
                      )}
                      {!root.showInMenu && (
                        <Badge className="gap-1">
                          <MenuSquare className="size-3" aria-hidden /> Oculta
                          del menú
                        </Badge>
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      className={cn(
                        buttonVariants({ variant: "text", size: "sm" }),
                      )}
                      href={`/admin/categorias/${root.id}`}
                    >
                      Editar
                    </Link>
                  </TableCell>
                </TableRow>
              );
              const childRows = kids.map((child) => (
                <TableRow key={child.id}>
                  <TableCell>
                    <span className="flex items-center gap-2.5 pl-6 text-ink-3">
                      <CornerDownRight
                        className="size-4 shrink-0"
                        aria-hidden
                      />
                      <span className="font-medium text-ink">{child.name}</span>
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="rounded-control border border-line px-2 py-0.5 font-mono text-xs text-ink-3">
                      {child.skuPrefix}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {child.productCount}
                  </TableCell>
                  <TableCell>
                    <span className="flex flex-wrap items-center gap-1.5">
                      {child.active ? (
                        <Badge className="gap-1">
                          <CircleCheck className="size-3" aria-hidden /> Activa
                        </Badge>
                      ) : (
                        <Badge className="gap-1">
                          <EyeOff className="size-3" aria-hidden /> Inactiva
                        </Badge>
                      )}
                      {!child.showInMenu && (
                        <Badge className="gap-1">
                          <MenuSquare className="size-3" aria-hidden /> Oculta
                          del menú
                        </Badge>
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      className={cn(
                        buttonVariants({ variant: "text", size: "sm" }),
                      )}
                      href={`/admin/categorias/${child.id}`}
                    >
                      Editar
                    </Link>
                  </TableCell>
                </TableRow>
              ));
              return [rootRow, ...childRows];
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
