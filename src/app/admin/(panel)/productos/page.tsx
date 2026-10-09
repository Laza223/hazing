import { requireAdmin } from "@/lib/admin/auth";
import Link from "next/link";
import Image from "next/image";
import {
  Plus,
  Search,
  Package,
  AlertTriangle,
  CircleCheck,
  EyeOff,
} from "lucide-react";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatARS } from "@/lib/money";
import { toNumber } from "@/lib/catalog/pricing";
import { productImageUrl } from "@/lib/images";
import { PageHeader } from "@/components/admin/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

interface SearchParams {
  q?: string;
  categoria?: string;
  activo?: string;
  bajostock?: string;
}

const inputClass =
  "h-11 w-full rounded-control border border-line bg-paper px-3 text-base text-ink outline-none transition-colors duration-ui ease-ui placeholder:text-ink-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink md:text-sm";
const selectClass =
  "h-11 rounded-control border border-line bg-paper px-3 text-sm text-ink outline-none transition-colors duration-ui ease-ui focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

export default async function ProductosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const categoriaId = (sp.categoria ?? "").trim();
  const activo = sp.activo ?? "";
  const lowStock = sp.bajostock === "1";

  const where: {
    deletedAt: null;
    active?: boolean;
    categoryId?: string;
    id?: { in: string[] };
    OR?: Array<
      | { name: { contains: string; mode: "insensitive" } }
      | {
          variants: {
            some: { sku: { contains: string; mode: "insensitive" } };
          };
        }
    >;
  } = { deletedAt: null };
  if (activo === "1") where.active = true;
  if (activo === "0") where.active = false;
  if (categoriaId) where.categoryId = categoriaId;
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { variants: { some: { sku: { contains: q, mode: "insensitive" } } } },
    ];
  }

  // El bajo stock es `stock <= lowStockThreshold` (dos columnas de la misma fila), algo que el
  // `where` de Prisma no compara directo: resolvemos los ids con SQL y los metemos en el `where`.
  if (lowStock) {
    const lowStockRows = await prisma.$queryRaw<
      Array<{ productId: string }>
    >(Prisma.sql`
      SELECT DISTINCT v."productId" AS "productId"
      FROM "ProductVariant" v
      JOIN "Product" p ON p."id" = v."productId"
      WHERE p."deletedAt" IS NULL AND v."stock" <= v."lowStockThreshold"
    `);
    where.id = { in: lowStockRows.map((r) => r.productId) };
  }

  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      include: {
        category: { select: { name: true } },
        variants: {
          select: { stock: true, lowStockThreshold: true, sku: true },
        },
      },
      ...(lowStock ? {} : { take: 200 }),
    }),
    prisma.category.findMany({
      where: { active: true },
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
  ]);

  const rows = products.map((p) => {
    const totalStock = p.variants.reduce((acc, v) => acc + v.stock, 0);
    const isLow = p.variants.some((v) => v.stock <= v.lowStockThreshold);
    const firstSku = p.variants[0]?.sku ?? "—";
    return { p, totalStock, isLow, firstSku };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Productos"
        subtitle="Acá ves, creás y editás todo lo que vendés."
        action={
          <Link className={cn(buttonVariants())} href="/admin/productos/nuevo">
            <Plus className="size-4" aria-hidden /> Nuevo producto
          </Link>
        }
      />

      <form
        className="rounded-control border border-line p-4"
        action="/admin/productos"
        method="get"
      >
        <div className="flex flex-wrap items-end gap-3">
          <div className="relative min-w-[12rem] grow">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3"
              aria-hidden
            />
            <input
              name="q"
              defaultValue={q}
              placeholder="Buscar por nombre o SKU"
              aria-label="Buscar producto"
              className={`${inputClass} pl-9`}
            />
          </div>
          <select
            name="categoria"
            defaultValue={categoriaId}
            aria-label="Categoría"
            className={selectClass}
          >
            <option value="">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            name="activo"
            defaultValue={activo}
            aria-label="Estado"
            className={selectClass}
          >
            <option value="">Activos e inactivos</option>
            <option value="1">Solo activos</option>
            <option value="0">Solo inactivos</option>
          </select>
          <label className="flex h-11 cursor-pointer items-center gap-2 rounded-control border border-line px-3 text-sm text-ink">
            <input
              type="checkbox"
              name="bajostock"
              value="1"
              defaultChecked={lowStock}
              className="size-4 accent-ink"
            />{" "}
            Bajo stock
          </label>
          <Button type="submit" variant="outline">
            Filtrar
          </Button>
        </div>
      </form>

      {rows.length === 0 ? (
        <div className="rounded-control border border-dashed border-line p-12 text-center">
          <Package className="mx-auto size-8 text-ink-4" aria-hidden />
          <p className="mt-4 text-base font-medium text-ink">
            Todavía no hay productos para mostrar
          </p>
          <p className="mt-1 text-sm text-ink-3">
            Creá tu primer producto para empezar a vender.
          </p>
          <Link
            className={cn(buttonVariants(), "mt-5")}
            href="/admin/productos/nuevo"
          >
            <Plus className="size-4" aria-hidden /> Nuevo producto
          </Link>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">Precio</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ p, totalStock, isLow, firstSku }) => {
              const thumb = productImageUrl(p.images[0]);
              return (
                <TableRow key={p.id}>
                  <TableCell>
                    <Link
                      href={`/admin/productos/${p.id}`}
                      className="flex items-center gap-3 font-medium text-ink outline-none hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                    >
                      <span className="relative size-10 shrink-0 overflow-hidden border border-line bg-paper-2">
                        {thumb ? (
                          <Image
                            src={thumb}
                            alt=""
                            fill
                            sizes="40px"
                            className="object-cover"
                          />
                        ) : (
                          <Package
                            className="absolute inset-0 m-auto size-4 text-ink-4"
                            aria-hidden
                          />
                        )}
                      </span>
                      {p.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-ink-3">
                    {p.category.name}
                  </TableCell>
                  <TableCell className="text-ink-3">{firstSku}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatARS(toNumber(p.basePrice))}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    <span className="inline-flex items-center gap-2">
                      {totalStock}
                      {isLow && (
                        <Badge className="gap-1">
                          <AlertTriangle className="size-3" aria-hidden /> Bajo
                        </Badge>
                      )}
                    </span>
                  </TableCell>
                  <TableCell>
                    {p.active ? (
                      <Badge className="gap-1">
                        <CircleCheck className="size-3" aria-hidden /> Activo
                      </Badge>
                    ) : (
                      <Badge className="gap-1">
                        <EyeOff className="size-3" aria-hidden /> Inactivo
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
