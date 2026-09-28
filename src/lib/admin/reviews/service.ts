import { prisma } from "@/lib/prisma";
import type { ReviewStatus } from "@prisma/client";

/**
 * Servicio propio del admin para moderar reseñas — `src/lib/reviews/` todavía
 * no existe (lo crea otro agente en la sub-fase 6.4, docs/spec/07-admin.md
 * §6 del contrato de esta tarea). Prisma directo, sin depender de ese módulo.
 */
export interface AdminReviewRow {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  authorName: string;
  rating: number;
  title: string | null;
  body: string;
  photoUrl: string | null;
  verifiedPurchase: boolean;
  status: ReviewStatus;
  createdAt: Date;
}

/** Reseñas por estado, más recientes primero. */
export async function listReviewsByStatus(
  status: ReviewStatus,
): Promise<AdminReviewRow[]> {
  const rows = await prisma.review.findMany({
    where: { status },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      productId: true,
      authorName: true,
      rating: true,
      title: true,
      body: true,
      photoUrl: true,
      verifiedPurchase: true,
      status: true,
      createdAt: true,
      product: { select: { name: true, slug: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    productId: r.productId,
    productName: r.product.name,
    productSlug: r.product.slug,
    authorName: r.authorName,
    rating: r.rating,
    title: r.title,
    body: r.body,
    photoUrl: r.photoUrl,
    verifiedPurchase: r.verifiedPurchase,
    status: r.status,
    createdAt: r.createdAt,
  }));
}

/** Aprueba o rechaza una reseña. `requireAdmin()` lo valida el Server Action que llama a esto. */
export async function moderateReview(
  id: string,
  action: "approve" | "reject",
): Promise<void> {
  await prisma.review.update({
    where: { id },
    data: { status: action === "approve" ? "approved" : "rejected" },
  });
}
