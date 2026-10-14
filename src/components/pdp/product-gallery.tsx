"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ImagePlaceholder } from "@/components/catalog/image-placeholder";

export interface ProductGalleryProps {
  /** URLs ya resueltas con `productImageUrl()`. Vacío = `ImagePlaceholder`. */
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
 *
 * Click en una foto → pantalla completa con todas las fotos apiladas en
 * `object-contain` (sin recorte), arrancando en la clickeada. En el celular
 * el pinch-zoom nativo sigue andando adentro del dialog.
 */
export function ProductGallery({
  images,
  name,
  className,
}: ProductGalleryProps) {
  const slides = images.length > 0 ? images : [null];
  const [active, setActive] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const [zoomed, setZoomed] = useState<number | null>(null);

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
              <button
                type="button"
                onClick={() => setZoomed(i)}
                aria-label={`Ampliar foto ${i + 1}`}
                className="absolute inset-0 cursor-zoom-in outline-none focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink"
              >
                <Image
                  src={src}
                  alt={`${name} — foto ${i + 1}`}
                  fill
                  sizes="(max-width: 768px) 100vw, 58vw"
                  priority={i === 0}
                  className="object-cover"
                />
              </button>
            ) : (
              <ImagePlaceholder />
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

      <Dialog
        open={zoomed !== null}
        onOpenChange={(open) => !open && setZoomed(null)}
      >
        <DialogContent
          className="inset-0 left-0 top-0 h-dvh max-w-none translate-x-0 translate-y-0 rounded-none border-0 p-0"
          onOpenAutoFocus={() => {
            // Radix enfoca el botón de cerrar; el scroll arranca en la foto
            // clickeada.
            const index = zoomed ?? 0;
            requestAnimationFrame(() =>
              document
                .getElementById(`zoom-${index}`)
                ?.scrollIntoView({ block: "start" }),
            );
          }}
        >
          <DialogTitle className="sr-only">{name} — fotos</DialogTitle>
          {/* El scroll vive adentro: el botón de cerrar (absoluto en el
              DialogContent) queda siempre a la vista. */}
          <div className="h-full overflow-y-auto [touch-action:pan-y_pinch-zoom]">
            <div className="mx-auto flex max-w-[1200px] flex-col gap-2">
              {images.map((src, i) => (
                <div
                  key={src}
                  id={`zoom-${i}`}
                  className="relative h-dvh w-full"
                >
                  <Image
                    src={src}
                    alt={`${name} — foto ${i + 1}`}
                    fill
                    sizes="100vw"
                    className="object-contain"
                  />
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
