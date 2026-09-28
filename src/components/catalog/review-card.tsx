import { RatingStars } from "@/components/ui/rating-stars";

export interface ReviewView {
  id: string;
  authorName: string;
  rating: number;
  title: string | null;
  body: string;
  verifiedPurchase: boolean;
  createdAt: Date;
}

export function ReviewCard({ review }: { review: ReviewView }) {
  return (
    <article className="space-y-2.5 border border-line p-4">
      <div className="flex items-center justify-between">
        <RatingStars value={review.rating} size="sm" />
        {review.verifiedPurchase && (
          <span className="tracking-caps-sm text-[11px] uppercase text-ink-3">
            Compra verificada
          </span>
        )}
      </div>

      {review.title && (
        <h3 className="text-sm font-medium text-ink">{review.title}</h3>
      )}

      <p className="text-sm leading-relaxed text-ink-2">{review.body}</p>

      <p className="pt-0.5 text-xs text-ink-3">
        {review.authorName} · {review.createdAt.toLocaleDateString("es-AR")}
      </p>
    </article>
  );
}
