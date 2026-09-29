"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

import { cn } from "@/lib/utils";
import { CtaLink } from "@/components/home/cta-link";
import { SCRUB } from "@/lib/motion/tokens";
import { useReducedMotion } from "@/lib/motion/use-reduced-motion";
import {
  ensureGsapPluginsRegistered,
  ScrollTrigger,
} from "@/lib/motion/scroll-trigger";
import { BRAND_STATEMENT, HERO_EYEBROW } from "@/lib/content/copy";

export interface HeroProps {
  /** Statement de la colección — el único `<h1>` de la home. */
  statement?: string;
  /** Línea chica sobre el statement (temporada, colección). */
  eyebrow?: string;
  /** Destino del link principal. Default: `/tienda`. */
  ctaHref?: string;
  ctaLabel?: string;
  /** Still desktop 3:2 (2880×1920). */
  imageSrc: string;
  /** Mismo still, mobile 4:5 (1600×2000). */
  imageSrcMobile: string;
  /**
   * `object-position` de la foto: el hero es más apaisado que la foto en casi
   * cualquier pantalla, así que `object-cover` recorta arriba y abajo. Se ancla
   * cerca del borde superior para no cortarle la cabeza a la modelo.
   */
  imagePosition?: string;
  className?: string;
}

/**
 * Hero de la home, con el header encima (`-mt-16`: el header es sticky de
 * 64px y sobre el hero va transparente, ver header.tsx).
 *
 * - Desktop: foto a sangre de alto completo; el statement va sobre la mitad
 *   derecha, que en la foto de campaña es pared lisa (la modelo está en el
 *   tercio izquierdo).
 * - Mobile y tablet (< 1024px): la foto 4:5 ocupa casi toda la pantalla y el statement va DEBAJO,
 *   sobre `paper`: en vertical la modelo ocupa el centro y cualquier texto
 *   encima le tapa el cuerpo.
 *
 * El texto va en `ink` directo, sin `mix-blend-mode`: el blend sobre la pared
 * gris daba un gris lavado casi ilegible.
 *
 * Movimiento: escala 1 → 1.06 de la foto atada al scroll de la propia sección.
 */
export function Hero({
  statement = BRAND_STATEMENT,
  eyebrow = HERO_EYEBROW,
  ctaHref = "/tienda",
  ctaLabel = "Ver la tienda",
  imageSrc,
  imageSrcMobile,
  imagePosition = "50% 0%",
  className,
}: HeroProps) {
  const reducedMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const backgroundRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const background = backgroundRef.current;
    if (!section || !background || reducedMotion) return;

    ensureGsapPluginsRegistered();
    const tween = gsap.fromTo(
      background,
      { scale: 1 },
      { scale: 1.06, ease: "none", paused: true },
    );
    const trigger = ScrollTrigger.create({
      trigger: section,
      start: "top top",
      end: "bottom top",
      scrub: SCRUB.min,
      animation: tween,
    });

    return () => {
      trigger.kill();
      tween.kill();
      gsap.set(background, { clearProps: "all" });
    };
  }, [reducedMotion]);

  return (
    <section
      ref={sectionRef}
      // `data-hero-section`: el Header lo observa para ir transparente mientras
      // está encima del hero (header.tsx).
      data-hero-section
      className={cn(
        "relative -mt-16 w-full bg-paper lg:h-[100svh] lg:min-h-[600px]",
        className,
      )}
    >
      <div className="relative h-[62svh] min-h-[420px] w-full overflow-hidden bg-paper-2 lg:absolute lg:inset-0 lg:h-full lg:min-h-0">
        <div ref={backgroundRef} className="absolute inset-0">
          <picture>
            <source media="(min-width: 1024px)" srcSet={imageSrc} />
            <img
              src={imageSrcMobile}
              alt=""
              aria-hidden="true"
              fetchPriority="high"
              className="absolute inset-0 h-full w-full object-cover"
              style={{ objectPosition: imagePosition }}
            />
          </picture>
        </div>
      </div>

      <div className="relative z-10 px-4 pb-12 pt-8 lg:absolute lg:bottom-0 lg:left-1/2 lg:right-0 lg:px-10 lg:pb-14 lg:pt-0">
        <p className="tracking-caps-sm mb-3 text-xs uppercase text-ink-2 lg:mb-5">
          {eyebrow}
        </p>
        <h1 className="tracking-caps-lg max-w-[12ch] font-display text-[clamp(2.5rem,5.2vw,5.25rem)] font-medium uppercase leading-[0.95] text-ink">
          {statement}
        </h1>
        <CtaLink href={ctaHref} className="mt-6 lg:mt-8">
          {ctaLabel}
        </CtaLink>
      </div>
    </section>
  );
}
