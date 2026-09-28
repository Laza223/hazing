import "server-only";
import { isUniqueConstraintError } from "@/lib/prisma-errors";

export interface WishlistDb {
  wishlist: {
    findUnique: (args: {
      where: {
        customerId_productId: { customerId: string; productId: string };
      };
    }) => Promise<{ customerId: string } | null>;
    create: (args: {
      data: { customerId: string; productId: string };
    }) => Promise<unknown>;
    delete: (args: {
      where: {
        customerId_productId: { customerId: string; productId: string };
      };
    }) => Promise<unknown>;
  };
}

export async function toggleWishlist(
  customerId: string,
  productId: string,
  deps: { db: WishlistDb },
): Promise<{ added: boolean }> {
  const key = { customerId_productId: { customerId, productId } };
  const existing = await deps.db.wishlist.findUnique({ where: key });
  if (existing) {
    await deps.db.wishlist.delete({ where: key });
    return { added: false };
  }
  try {
    await deps.db.wishlist.create({ data: { customerId, productId } });
  } catch (e) {
    // Doble toque concurrente: el otro request ya lo agregó. El estado final
    // es "en favoritos", que es lo que pidió la clienta.
    if (!isUniqueConstraintError(e)) throw e;
  }
  return { added: true };
}
