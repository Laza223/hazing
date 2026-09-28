"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleWishlistAction } from "@/app/(storefront)/cuenta/favoritos/actions";

/**
 * WishlistHeart — corazón Lucide en la PDP, sin color (relleno `ink` cuando
 * está marcado, ver CLAUDE.md). Sin sesión, lleva a `/ingresar?next=...`.
 */
export function WishlistHeart({
  productId,
  productSlug,
  initial = false,
  className,
}: {
  productId: string;
  productSlug: string;
  initial?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [active, setActive] = useState(initial);
  const [pending, startTransition] = useTransition();

  function onClick() {
    const next = !active;
    setActive(next); // optimista
    startTransition(async () => {
      const res = await toggleWishlistAction(productId);
      if (res.needsAuth) {
        router.push(
          `/ingresar?next=${encodeURIComponent(`/producto/${productSlug}`)}`,
        );
        setActive(!next);
        return;
      }
      if (!res.ok) {
        setActive(!next); // revertir
        return;
      }
      if (typeof res.added === "boolean") setActive(res.added);
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={active}
      aria-label={active ? "Quitar de favoritos" : "Agregar a favoritos"}
      className={cn(
        "inline-flex min-h-11 min-w-11 items-center justify-center border border-line text-ink outline-none transition-colors duration-ui ease-ui focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
        className,
      )}
    >
      <Heart className={cn("size-5", active && "fill-ink")} aria-hidden />
    </button>
  );
}
