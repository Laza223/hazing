"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";

import { cn } from "@/lib/utils";
import { SCRUB } from "@/lib/motion/tokens";
import { useReducedMotion } from "@/lib/motion/use-reduced-motion";
import {
  ensureGsapPluginsRegistered,
  ScrollTrigger,
} from "@/lib/motion/scroll-trigger";
import { BRAND_STATEMENT } from "@/lib/content/copy";
import { useHomeSequenceNode } from "@/components/home/home-sequence-context";

export interface HeroProps {
  /**
   * Nombre de la colección o statement de una línea (A7, §12 de
   * docs/spec/05-direccion-arte.md — "Bloquea: 5.2", todavía sin confirmar
   * por la dueña). Hasta que exista copy definitivo se usa el borrador de
   * `BRAND_STATEMENT` (src/lib/content/copy.ts), pensado explícitamente para
   * el hero. El integrador puede overridear con el nombre real apenas exista.
   */
  collectionLabel?: string;
  /** Destino del link "Ver" de la línea inferior. Default: `/tienda`. */
  ctaHref?: string;
  /** A2 — fashion film del hero, desktop 16:9 (3840×2160 o 1920×1080). */
  videoSrc?: string;
  /** A2 — mismo film, mobile 9:16 (1080×1920). */
  videoSrcMobile?: string;
  /** Poster del film — es el candidato a LCP (§10), AVIF ≤ 120 KB. */
  posterSrc?: string;
  /** A2b — still de hero si no hay film, desktop 3:2 (2880×1920). */
  imageSrc?: string;
  /** A2b — mismo still, mobile 4:5 (1600×2000). */
  imageSrcMobile?: string;
  /**
   * A3 — la "imagen clave" 3:4 que ancla el beat 3 (Hero → NEW IN, ver
   * hero-to-commerce.tsx). Sin esta prop el beat 3 cae a Modo B (wipe sin
   * Flip) — la propia `HomeSequenceProvider` decide `hasKeyImage` a partir
   * de si el producto destacado tiene esta imagen.
   */
  keyImageSrc?: string;
  keyImageAlt?: string;
  className?: string;
}

interface AssetSlotProps {
  code: string;
  label: string;
  spec: string;
  className?: string;
}

/**
 * Slot de asset pendiente — regla dura del §12: si el asset no existe, NO se
 * inventa un sustituto (degradé, patrón, foto de stock). Se muestra el
 * código exacto y las medidas hasta que el asset real llegue. Mismo patrón
 * que `ProductTile` usa para A4 (src/components/catalog/product-tile.tsx).
 */
function AssetSlot({ code, label, spec, className }: AssetSlotProps) {
  return (
    <div
      className={cn(
        "absolute inset-0 flex flex-col items-center justify-center gap-1 border border-line-2 bg-paper-2 px-4 text-center",
        className,
      )}
    >
      <span className="tracking-caps-sm text-[12px] font-medium uppercase text-ink-2">
        {code} · {label}
      </span>
      <span className="text-[12px] text-ink-4">{spec}</span>
    </div>
  );
}

/**
 * Hero — beat 2 de la coreografía de home (docs/spec/05-direccion-arte.md
 * §4). Fullscreen, sin UI salvo la línea inferior de 12 px. Al scrollear:
 * el fondo escala 1 → 1.10 y se desplaza ≤ 8 % (parallax controlado), la
 * línea de texto se desvanece — ambos en scrub ligado al propio alto de la
 * sección (100vh · scrub, tabla del §4).
 *
 * La "imagen clave" (A3, 3:4) es un nodo aparte, registrado en
 * `HomeSequenceProvider` bajo la key `heroKeyImage`: es el punto de partida
 * del Flip del beat 3 (hero-to-commerce.tsx la lee, esta sección no sabe
 * nada de NEW IN ni de GSAP Flip).
 */
export function Hero({
  collectionLabel = BRAND_STATEMENT,
  ctaHref = "/tienda",
  videoSrc,
  videoSrcMobile,
  posterSrc,
  imageSrc,
  imageSrcMobile,
  keyImageSrc,
  keyImageAlt = "Prenda destacada de la colección",
  className,
}: HeroProps) {
  const reducedMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const backgroundRef = useRef<HTMLDivElement>(null);
  const captionRef = useRef<HTMLDivElement>(null);
  const registerKeyImage = useHomeSequenceNode("heroKeyImage");

  // §10: el film "carga después del LCP y solo con
  // (prefers-reduced-data: no-preference)" — el poster/still es el LCP real,
  // el <video> es una mejora progresiva que se activa después de montar,
  // nunca antes, y nunca si el visitante pidió menos datos o reducedMotion.
  const [allowVideo, setAllowVideo] = useState(false);
  useEffect(() => {
    if (reducedMotion) return;
    const mql = window.matchMedia("(prefers-reduced-data: reduce)");
    setAllowVideo(!mql.matches);
  }, [reducedMotion]);

  // Beat 2: escala + parallax del fondo, fade de la línea inferior.
  useEffect(() => {
    const section = sectionRef.current;
    const background = backgroundRef.current;
    const caption = captionRef.current;
    if (!section || !background || !caption) return;

    if (reducedMotion) {
      // Modo reducido de primera clase (§8/§11): sin scrub, estado final
      // estático — nada que animar, nada que limpiar.
      return;
    }

    ensureGsapPluginsRegistered();

    // `ScrollTrigger.create({ animation })` en vez del atajo
    // `gsap.timeline({ scrollTrigger: {...} })`: ese atajo no expone un
    // `.scrollTrigger` tipado en la instancia del timeline (los tipos de
    // gsap 3.15 no lo declaran), así que el cleanup necesita la referencia
    // explícita al ScrollTrigger creado, no un cast a `any`.
    const tl = gsap.timeline({ paused: true });
    tl.fromTo(
      background,
      { scale: 1, yPercent: 0 },
      { scale: 1.1, yPercent: -8, ease: "none", duration: 1 },
      0,
    );
    tl.to(caption, { autoAlpha: 0, ease: "none", duration: 1 }, 0);

    const trigger = ScrollTrigger.create({
      trigger: section,
      start: "top top",
      end: "bottom top",
      scrub: SCRUB.min,
      animation: tl,
    });

    return () => {
      trigger.kill();
      tl.kill();
      gsap.set([background, caption], { clearProps: "all" });
    };
  }, [reducedMotion]);

  return (
    <section
      ref={sectionRef}
      // `data-hero-section`: el Header lo observa para saber cuándo está
      // superpuesto al hero y pasar a `mix-blend-mode: difference` (§4 beat 2,
      // "legible sobre cualquier foto sin banda blanca"). Es el único
      // acoplamiento entre el shell y la home, y es por atributo — el header
      // vive en el layout del grupo de ruta y no puede importar este módulo.
      data-hero-section
      className={cn(
        "relative h-screen w-full overflow-hidden bg-paper-2",
        className,
      )}
    >
      {/* Fondo — A2 (film) con fallback a A2b (still); si ninguno existe,
          slot. Un solo ratio por breakpoint (§3.1): 16/9 desktop, 9/16 mobile,
          nunca los dos a la vez en el DOM visible. */}
      <div ref={backgroundRef} className="absolute inset-0 h-full w-full">
        <div className="absolute inset-0 hidden md:block">
          {allowVideo && videoSrc ? (
            <video
              className="absolute inset-0 h-full w-full object-cover"
              poster={posterSrc}
              src={videoSrc}
              muted
              loop
              playsInline
              autoPlay
              preload="metadata"
              aria-hidden="true"
            />
          ) : imageSrc || posterSrc ? (
            <img
              src={imageSrc ?? posterSrc}
              alt=""
              aria-hidden="true"
              fetchPriority="high"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <AssetSlot
              code="A2 / A2b"
              label="Fashion film o still del hero"
              spec="Desktop 16:9 — film 3840×2160 (o 1920×1080), 8–15s loop sin audio · still 3:2 2880×1920"
            />
          )}
        </div>
        <div className="absolute inset-0 md:hidden">
          {allowVideo && videoSrcMobile ? (
            <video
              className="absolute inset-0 h-full w-full object-cover"
              poster={posterSrc}
              src={videoSrcMobile}
              muted
              loop
              playsInline
              autoPlay
              preload="metadata"
              aria-hidden="true"
            />
          ) : imageSrcMobile || posterSrc ? (
            <img
              src={imageSrcMobile ?? posterSrc}
              alt=""
              aria-hidden="true"
              fetchPriority="high"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <AssetSlot
              code="A2 / A2b"
              label="Fashion film o still del hero"
              spec="Mobile 9:16 — film 1080×1920, 8–15s loop sin audio · still 4:5 1600×2000"
            />
          )}
        </div>
      </div>

      {/* Imagen clave — A3, 3:4. Nodo registrado para el beat 3
          (hero-to-commerce.tsx). NO participa del scrub de fondo: es un
          panel quieto anclado abajo a la derecha. */}
      <div
        ref={registerKeyImage}
        className="absolute bottom-24 right-4 z-10 aspect-[3/4] w-[38vw] max-w-[220px] overflow-hidden border border-line-2 bg-paper md:bottom-28 md:right-10 md:w-[22vw] md:max-w-[320px]"
      >
        {keyImageSrc ? (
          <img
            src={keyImageSrc}
            alt={keyImageAlt}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <AssetSlot
            code="A3"
            label="Imagen clave"
            spec="3:4 — enlaza con NEW IN #1, lado largo ≥ 3000px"
          />
        )}
      </div>

      {/* Línea inferior — única UI del hero (§4 beat 2). `mix-blend-difference`
          + texto `paper`: legible tanto sobre el slot (paper/line-2, da ink)
          como sobre una foto oscura real, mismo truco que el header (§4). */}
      <div
        ref={captionRef}
        // data-mix-blend-difference: selector estable para que el E2E
        // (tests/e2e/storefront-shell.spec.ts, signature-moment.spec.ts)
        // excluya SOLO este nodo del chequeo de contraste de axe — axe-core
        // no evalúa `mix-blend-mode` (issue conocido, dequelabs/axe-core#1029):
        // lee el color declarado (`paper`/blanco) contra el fondo debajo en
        // el DOM, no el píxel ya mezclado. El contraste real, calculado a
        // mano, es alto: sobre el slot (`paper-2` #FAFAFA) el blend produce
        // texto casi negro (|255-250|≈5,5,5) — y sobre una foto real vale el
        // mismo truco que usa el header (§4 beat 2: "legible sobre cualquier
        // foto sin banda blanca").
        data-mix-blend-difference
        className="absolute bottom-4 left-4 z-10 flex items-center gap-2 text-[12px] uppercase text-paper mix-blend-difference md:bottom-6 md:left-10"
      >
        {/* Único <h1> de la home: el statement de la colección. La jerarquía
            sigue con los <h2> de NEW IN, lookbook y editorial. Sin esto la
            home queda sin encabezado de nivel 1 — regresión de accesibilidad
            que encontró la revisión adversarial de 5.2. */}
        <h1 className="tracking-caps-sm text-[12px] font-normal uppercase">
          {collectionLabel}
        </h1>
        <Link
          href={ctaHref}
          className="tracking-caps-sm underline underline-offset-2 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper"
        >
          Ver
        </Link>
      </div>
    </section>
  );
}
