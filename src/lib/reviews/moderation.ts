import type { ReviewStatus } from "@prisma/client";

/**
 * Decide la visibilidad de una reseña recién creada (docs/spec/06-storefront.md):
 * la compra verificada se auto-publica; el resto entra a la cola de moderación
 * (la aprueba la dueña en el admin de Fase 7).
 */
export function classifyReview(hasPurchased: boolean): {
  status: ReviewStatus;
  verifiedPurchase: boolean;
} {
  return hasPurchased
    ? { status: "approved", verifiedPurchase: true }
    : { status: "pending", verifiedPurchase: false };
}
