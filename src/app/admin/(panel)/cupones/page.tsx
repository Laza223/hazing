import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/catalog/pricing";
import { formatARS } from "@/lib/money";
import { PageHeader } from "@/components/admin/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { CouponActiveToggle } from "./coupon-active-toggle";
import type { CouponType } from "@prisma/client";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<CouponType, string> = {
  percentage: "Porcentaje",
  fixed: "Monto fijo",
  free_shipping: "Envío gratis",
};

function valueLabel(type: CouponType, value: number): string {
  if (type === "percentage") return `${value}%`;
  if (type === "fixed") return formatARS(value);
  return "Envío gratis";
}

function dateLabel(d: Date | null): string {
  if (!d) return "—";
  // Sin `timeZone` explícito, `toLocaleDateString` usa la zona del server (UTC en Vercel), no
  // ART — un `validTo` guardado a las 23:59:59.999 ART (02:59:59.999 UTC del día siguiente)
  // mostraría un día de más. Ver `lib/admin/coupons/validation.ts`.
  return d.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

export default async function CuponesPage() {
  const coupons = await prisma.coupon.findMany({ orderBy: { code: "asc" } });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cupones"
        subtitle="Creá y administrá los códigos de descuento para tus clientas."
        action={
          <Link href="/admin/cupones/nuevo" className={cn(buttonVariants())}>
            Nuevo cupón
          </Link>
        }
      />

      {coupons.length === 0 ? (
        <div className="rounded-control border border-dashed border-line p-12 text-center">
          <p className="text-base font-medium text-ink">
            Todavía no tenés cupones
          </p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-3">
            Un cupón es un código que tus clientas escriben al pagar para
            llevarse un descuento o el envío gratis.
          </p>
          <Link
            href="/admin/cupones/nuevo"
            className={cn(buttonVariants(), "mt-5 inline-flex")}
          >
            Crear el primero
          </Link>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Tipo / Valor</TableHead>
              <TableHead>Vigencia</TableHead>
              <TableHead className="text-right">Usos</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coupons.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium tracking-wide text-ink">
                  {c.code}
                </TableCell>
                <TableCell>
                  <Badge>{TYPE_LABEL[c.type]}</Badge>{" "}
                  <span className="font-medium tabular-nums">
                    {valueLabel(c.type, toNumber(c.value))}
                  </span>
                </TableCell>
                <TableCell className="tabular-nums text-ink-3">
                  {dateLabel(c.validFrom)} → {dateLabel(c.validTo)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {c.usedCount}
                  {c.maxUses != null ? ` / ${c.maxUses}` : ""}
                </TableCell>
                <TableCell>
                  <Badge>{c.active ? "Activo" : "Inactivo"}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <CouponActiveToggle id={c.id} active={c.active} />
                    <Link
                      href={`/admin/cupones/${c.id}`}
                      className={cn(
                        buttonVariants({ variant: "outline", size: "sm" }),
                      )}
                    >
                      Editar
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
