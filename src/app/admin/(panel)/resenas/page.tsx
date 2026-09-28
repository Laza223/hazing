import Link from "next/link";
import Image from "next/image";
import { Star, MessageSquareQuote, User, CalendarDays } from "lucide-react";

import {
  listReviewsByStatus,
  type AdminReviewRow,
} from "@/lib/admin/reviews/service";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { productImageUrl } from "@/lib/images";
import { ReviewActionsButtons } from "./review-actions-buttons";

export const dynamic = "force-dynamic";

function dateLabel(d: Date): string {
  return d.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function ReviewCard({ review }: { review: AdminReviewRow }) {
  return (
    <li className="flex flex-col overflow-hidden rounded-control border border-line">
      <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-3">
        <Link
          href={`/producto/${review.productSlug}`}
          target="_blank"
          className="inline-flex min-w-0 items-center gap-1.5 text-sm font-medium text-ink underline underline-offset-4 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <MessageSquareQuote
            className="size-4 shrink-0 text-ink-3"
            aria-hidden
          />
          <span className="truncate">{review.productName}</span>
        </Link>
        <Badge>{review.status}</Badge>
      </div>

      <div className="flex flex-1 flex-col gap-3 px-5 py-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-ink">
          <span className="inline-flex items-center gap-1">
            <Star className="size-3.5" aria-hidden />
            {review.rating}/5
          </span>
          {review.verifiedPurchase ? <Badge>Compra verificada</Badge> : null}
        </div>

        {review.title ? (
          <p className="font-medium text-ink">{review.title}</p>
        ) : null}
        <p className="text-sm leading-relaxed text-ink-2">{review.body}</p>

        {review.photoUrl ? (
          <a
            href={productImageUrl(review.photoUrl) ?? review.photoUrl}
            target="_blank"
            rel="noreferrer"
            className="relative block size-20 overflow-hidden border border-line outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            <Image
              src={productImageUrl(review.photoUrl) ?? review.photoUrl}
              alt="Foto adjunta"
              fill
              sizes="80px"
              className="object-cover"
            />
          </a>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 text-xs text-ink-4">
          <span className="inline-flex items-center gap-1.5">
            <User className="size-3.5" aria-hidden />
            {review.authorName}
          </span>
          <span className="inline-flex items-center gap-1.5 tabular-nums">
            <CalendarDays className="size-3.5" aria-hidden />
            {dateLabel(review.createdAt)}
          </span>
        </div>
      </div>

      {review.status === "pending" ? (
        <div className="border-t border-line px-5 py-3">
          <ReviewActionsButtons id={review.id} slug={review.productSlug} />
        </div>
      ) : null}
    </li>
  );
}

function ReviewSection({
  title,
  reviews,
}: {
  title: string;
  reviews: AdminReviewRow[];
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-medium text-ink">
        {title} <span className="text-ink-4">({reviews.length})</span>
      </h2>
      {reviews.length === 0 ? (
        <p className="rounded-control border border-dashed border-line p-6 text-center text-sm text-ink-3">
          No hay reseñas en este estado.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {reviews.map((r) => (
            <ReviewCard key={r.id} review={r} />
          ))}
        </ul>
      )}
    </section>
  );
}

export default async function ResenasPage() {
  const [pending, approved, rejected] = await Promise.all([
    listReviewsByStatus("pending"),
    listReviewsByStatus("approved"),
    listReviewsByStatus("rejected"),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Reseñas"
        subtitle="Aprobá o rechazá las reseñas pendientes antes de que se publiquen en la tienda."
      />

      <ReviewSection title="Pendientes" reviews={pending} />
      <ReviewSection title="Aprobadas" reviews={approved} />
      <ReviewSection title="Rechazadas" reviews={rejected} />
    </div>
  );
}
