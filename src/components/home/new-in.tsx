"use client";

import { useEffect, useId, useRef } from "react";
import type { Ref } from "react";
import gsap from "gsap";

import { cn } from "@/lib/utils";
import { DURATION, EASE, STAGGER } from "@/lib/motion/tokens";
import { useReducedMotion } from "@/lib/motion/use-reduced-motion";
import {
  ensureGsapPluginsRegistered,
  ScrollTrigger,
} from "@/lib/motion/scroll-trigger";
import { ProductTile } from "@/components/catalog/product-tile";

/**
 * Un producto tal como lo necesita esta sección — deliberadamente MÁS chico
 * que `CatalogListItem` (src/lib/catalog/types.ts): la resolución de imágenes
 * contra Supabase Storage es Fase 6/7 (fuera de alcance), así que el
 * integrador arma este shape desde lo que tenga (datos reales o mocks) sin
 * que este componente conozca Prisma.
 */
export interface NewInItem {
  id: string;
  href: string;
  name: string;
  price: number;
  compareAtPrice?: number;
  /** `null`/`undefined` = SLOT pendiente (A4, §12) — `ProductTile` ya lo resuelve. */
  imageSrc?: string | null;
  imageSrcHover?: string | null;
  imageAlt: string;
}

export interface NewInProps {
  items: NewInItem[];
  /**
   * Rótulo de sección, Inter 12px 0.12em mayúsculas (rol "H2 / nombre de
   * sección" del §3.1). `null` lo omite (por si el integrador prefiere que
   * NEW IN entre sin encabezado propio, p. ej. justo debajo del hero).
   */
  title?: string | null;
  /**
   * Ref al contenedor del PRIMER tile. El beat 3 (§4, "Hero → comercio")
   * contrae la imagen clave del hero hasta este nodo vía GSAP Flip — el
   * componente que orquesta esa transición (HeroToCommerce, fuera de este
   * alcance) necesita un target real en el DOM antes del Flip.
   *
   * Dos formas de llegar al mismo <div>, usá la que le quede más cómoda al
   * integrador:
   *   1. Esta ref (objeto o callback).
   *   2. `document.querySelector('[data-new-in-hero-tile]')` — el atributo
   *      vive en el mismo nodo.
   * Si el hero no tiene imagen clave asociada (fallback de wipe, §4 beat 3),
   * el integrador simplemente no lee esta ref.
   */
  heroTileRef?: Ref<HTMLDivElement>;
  className?: string;
}

/**
 * NewIn — beat 4 del §4 (docs/spec/05-direccion-arte.md).
 *
 * Grilla de 2 columnas desktop (`lg:grid-cols-2`, tiles ~45vw dentro del
 * contenedor con máximo 1600px del §3.1 — el "45vw" de la tabla de
 * coreografía describe la proporción visual, no un ancho en viewport units
 * literal, que rompería el máximo de grilla). Mobile: el primer tile ocupa
 * las 2 columnas (100vw) y el resto queda a 1 columna (50vw), tal como pide
 * el §9.
 *
 * Entrada: `imageSettle` + `fadeUp` (primitivas del §8), stagger 60ms,
 * disparada una sola vez por `ScrollTrigger` (`once: true`). El §8 describe
 * `imageSettle` con una duración propia de 900ms que NO tiene token en
 * `tokens.ts` (solo hay 700/1200 cerca) — usamos `DURATION.image` (700ms,
 * "crossfade de imagen, swap de tile") por ser el token más cercano y
 * semánticamente correcto para una animación de imagen, en vez de
 * hardcodear 900 fuera del sistema de tokens (regla dura del proyecto).
 */
export function NewIn({
  items,
  title = "Nuevo",
  heroTileRef,
  className,
}: NewInProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const headingId = useId();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const revealItems =
      container.querySelectorAll<HTMLElement>("[data-reveal-item]");
    if (revealItems.length === 0) return;

    if (reducedMotion) {
      // Sin scale/translate en reduced motion (§8): si un cambio de
      // preferencia a mitad de sesión dejó algún inline style de un run
      // anterior (ScrollTrigger todavía no disparó `onEnter`), lo limpiamos
      // para que los tiles queden visibles de forma instantánea.
      gsap.set(revealItems, { clearProps: "opacity,transform" });
      return;
    }

    ensureGsapPluginsRegistered();
    gsap.set(revealItems, { opacity: 0, y: 12, scale: 1.06 });

    const trigger = ScrollTrigger.create({
      trigger: container,
      start: "top 85%",
      once: true,
      onEnter: () => {
        gsap.to(revealItems, {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: DURATION.image,
          ease: EASE.outExpo,
          stagger: STAGGER.max,
        });
      },
    });

    return () => trigger.kill();
  }, [items.length, reducedMotion]);

  if (items.length === 0) return null;

  return (
    <section
      className={cn(
        "px-4 py-16 md:px-10 md:py-24 lg:px-16 lg:py-32",
        className,
      )}
      aria-labelledby={title ? headingId : undefined}
      aria-label={title ? undefined : "Nuevo"}
    >
      {title && (
        <h2
          id={headingId}
          className="tracking-caps-sm mb-6 text-xs uppercase text-ink-2 md:mb-10"
        >
          {title}
        </h2>
      )}
      <div ref={containerRef} className="grid grid-cols-2 gap-4 md:gap-6">
        {items.map((item, index) => {
          const isHeroTile = index === 0;
          return (
            <div
              key={item.id}
              data-reveal-item
              data-new-in-hero-tile={isHeroTile ? "" : undefined}
              ref={isHeroTile ? heroTileRef : undefined}
              className={isHeroTile ? "col-span-2 lg:col-span-1" : "col-span-1"}
            >
              <ProductTile
                href={item.href}
                name={item.name}
                price={item.price}
                compareAtPrice={item.compareAtPrice}
                imageSrc={item.imageSrc}
                imageSrcHover={item.imageSrcHover}
                imageAlt={item.imageAlt}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
