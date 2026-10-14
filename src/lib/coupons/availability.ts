import { prisma } from "@/lib/prisma";

/**
 * ¿Hay algún cupón que la clienta pueda usar hoy? Sin ninguno activo y vigente,
 * el carrito y el checkout no muestran el campo "¿Tenés un cupón?" (decisión de
 * la dueña, 2026-10-14: hoy no hay cupones).
 */
export async function hasRedeemableCoupons(now = new Date()): Promise<boolean> {
  const count = await prisma.coupon.count({
    where: {
      active: true,
      AND: [
        { OR: [{ validFrom: null }, { validFrom: { lte: now } }] },
        { OR: [{ validTo: null }, { validTo: { gte: now } }] },
      ],
    },
  });
  return count > 0;
}
