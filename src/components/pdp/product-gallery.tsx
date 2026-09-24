"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

import { cn } from "@/lib/utils";

export interface ProductGalleryProps {
  /** URLs ya resueltas con `productImageUrl()`. Vacío = slot del asset A4. */
  images: string[];
  name: string;
  className?: string;
}

/**
 * ProductGallery — PDP (docs/spec/05-direccion-arte.md §7, es la spec
 * exacta). Desktop: imágenes 3:4 apiladas verticalmente en una sola columna,
 * sin carrusel ni flechas. Mobile: el MISMO track con scroll-snap horizontal
 * nativo y contador "1 / N" (12 px) — un solo árbol de imágenes para no
 * duplicar requests entre el layout de escritorio y el de mobile.
 *
 * Sin imágenes → slot del asset A4 (regla del §12: no se inventa un
 * sustituto), mismo patrón que `ProductTile`.
 */
export function ProductGallery({
  images,
  name,
  className,
}: ProductGalleryProps) {
  const slides = images.length > 0 ? images : [null];
  const [active, setActive] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  // Mobile: el contador "1 / N" sigue el scroll-snap nativo (sin JS de
  // navegación propio: el gesto es el scroll horizontal del navegador).
  useEffect(() => {
    const track = trackRef.current;
    if (!track || slides.length <= 1) return;
    const onScroll = () => {
      const index = Math.round(track.scrollLeft / track.clientWidth);
      setActive(Math.min(slides.length - 1, Math.max(0, index)));
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => track.removeEventListener("scroll", onScroll);
  }, [slides.length]);

  return (
    <div className={cn("relative", className)}>
      <div
        ref={trackRef}
        className="flex snap-x snap-mandatory overflow-x-auto md:snap-none md:flex-col md:gap-2 md:overflow-visible"
      >
        {slides.map((src, i) => (
          <div
            key={i}
            className="relative aspect-[3/4] w-full shrink-0 snap-start overflow-hidden border border-line-2 bg-paper-2 md:shrink"
          >
            {src ? (
              <Image
                src={src}
                alt={`${name} — foto ${i + 1}`}
                fill
                sizes="(max-width: 768px) 100vw, 58vw"
                priority={i === 0}
                className="object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-xs text-ink-4">
                A4 · foto de producto pendiente
              </div>
            )}
          </div>
        ))}
      </div>

      {slides.length > 1 && (
        <p
          className="mt-2 text-center text-[12px] tabular-nums text-ink-3 md:hidden"
          aria-live="polite"
        >
          {active + 1} / {slides.length}
        </p>
      )}
    </div>
  );
}
