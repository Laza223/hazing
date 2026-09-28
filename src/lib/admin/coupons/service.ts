import { prisma } from "@/lib/prisma";
import type { CouponClean } from "@/lib/admin/coupons/validation";

/** Superficie mínima de DB que usa el servicio (para inyectar fakes en tests). */
export interface CouponDb {
  coupon: {
    findUnique: (args: {
      where: { code: string } | { id: string };
    }) => Promise<{ id: string } | null>;
    create: (args: { data: CouponData }) => Promise<{ id: string }>;
    update: (args: {
      where: { id: string };
      data: Partial<CouponData>;
    }) => Promise<{ id: string }>;
  };
}

export interface CouponDeps {
  db: CouponDb;
}

export function defaultCouponDeps(): CouponDeps {
  return { db: prisma as unknown as CouponDb };
}

/** Payload de persistencia (mapea 1:1 al modelo Coupon de Prisma). */
interface CouponData {
  code: string;
  type: CouponClean["type"];
  value: number;
  scope: CouponClean["scope"];
  scopeId: string | null;
  minSubtotal: number | null;
  maxUses: number | null;
  perCustomerLimit: number | null;
  validFrom: Date | null;
  validTo: Date | null;
  active: boolean;
}

function toData(input: CouponClean): CouponData {
  return {
    code: input.code,
    type: input.type,
    value: input.value,
    scope: input.scope,
    scopeId: input.scopeId,
    minSubtotal: input.minSubtotal,
    maxUses: input.maxUses,
    perCustomerLimit: input.perCustomerLimit,
    validFrom: input.validFrom,
    validTo: input.validTo,
    active: input.active,
  };
}

/** Crea un cupón. Lanza si el código ya existe (la unicidad va acá, no en el validador). */
export async function createCoupon(
  input: CouponClean,
  deps: CouponDeps,
): Promise<{ id: string }> {
  const existing = await deps.db.coupon.findUnique({
    where: { code: input.code },
  });
  if (existing) throw new Error("Ya existe un cupón con ese código.");
  const created = await deps.db.coupon.create({ data: toData(input) });
  return { id: created.id };
}

/** Actualiza un cupón. El código solo puede chocar consigo mismo. */
export async function updateCoupon(
  id: string,
  input: CouponClean,
  deps: CouponDeps,
): Promise<{ id: string }> {
  const existing = await deps.db.coupon.findUnique({
    where: { code: input.code },
  });
  if (existing && existing.id !== id)
    throw new Error("Ya existe otro cupón con ese código.");
  const updated = await deps.db.coupon.update({
    where: { id },
    data: toData(input),
  });
  return { id: updated.id };
}

/**
 * Activa/desactiva un cupón sin pasar por el resto del formulario (baja lógica: nunca se
 * borra un cupón, los pedidos ya emitidos lo referencian por `couponId`).
 */
export async function setCouponActive(
  id: string,
  active: boolean,
  deps: CouponDeps,
): Promise<{ id: string }> {
  const updated = await deps.db.coupon.update({
    where: { id },
    data: { active },
  });
  return { id: updated.id };
}
