"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";

import { cn } from "@/lib/utils";
import { SCRUB } from "@/lib/motion/tokens";
import {
  ensureGsapPluginsRegistered,
  ScrollTrigger,
} from "@/lib/motion/scroll-trigger";

/**
 * Lookbook — beat 6 del §4, mecánica detallada en §4.1.
 *
 * Contrato: 6-8 looks. Fuera de rango, `console.warn` en dev (no `throw`:
 * el integrador puede estar armando la sección con datos provisorios).
 * Deliberadamente SIN `href` por look — la spec de §4.1 no pide CTA por
 * imagen (a diferencia de EditorialStory, que sí tiene "Comprar el look").
 * Un link por frame reabriría el problema de foco descripto en el riesgo 1
 * del plan: Tab hacia un <a> fuera de viewport en el track pineado no puede
 * autoscrollearse con GSAP sin violar "ninguna animación dispara scrollTo"
 * (§8) — se resuelve antes de agregar CTAs, no acá.
 */
export interface LookbookLook {
  id: string;
  /** "01".."08" — provisto por el caller, no autogenerado. */
  number: string;
  /** Nombre de la prenda, Inter 12px. */
  name: string;
  /** `null`/`undefined` = SLOT pendiente (regla §12, igual que ProductTile). */
  imageSrc?: string | null;
  imageAlt: string;
}

export interface LookbookProps {
  /** Contrato: 6-8 looks. */
  looks: LookbookLook[];
  className?: string;
}

// Alturas/gaps FIJOS (nunca Math.random): SSR/CSR y los recálculos de resize
// de ScrollTrigger tienen que ser determinísticos, porque `getDistance()`
// (más abajo) depende del layout real del track, no de un valor estimado.
// Ciclan por índice % length si looks.length > 8.
const FRAME_HEIGHT_VH = [85, 55, 70, 45, 60, 50, 80, 40] as const;
const GAP_AFTER_VW = [10, 16, 8, 20, 12, 18, 9] as const; // length - 1 gaps

const MIN_LOOKS = 6;
const MAX_LOOKS = 8;

export function Lookbook({ looks, className }: LookbookProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  if (
    process.env.NODE_ENV !== "production" &&
    (looks.length < MIN_LOOKS || looks.length > MAX_LOOKS)
  ) {
    // eslint-disable-next-line no-console -- aviso de contrato en dev, no bloquea el render (ver docstring).
    console.warn(
      `Lookbook: se esperaban ${MIN_LOOKS}-${MAX_LOOKS} looks, se recibieron ${looks.length}.`,
    );
  }

  useLayoutEffect(() => {
    ensureGsapPluginsRegistered();

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      // Una sola condición combinada: desktop CON preferencia de movimiento
      // completa. Si el usuario prefiere movimiento reducido, esta rama no
      // corre NUNCA (ni en desktop) — el componente queda en su markup base
      // (track con overflow-x:auto nativo, foco/scroll instantáneo), que es
      // el mismo comportamiento final que mobile (§4.1, §9, §11).
      mm.add(
        {
          pinnable:
            "(min-width: 1024px) and (prefers-reduced-motion: no-preference)",
        },
        (ctxCond) => {
          const { pinnable } = ctxCond.conditions as { pinnable: boolean };
          if (!pinnable) return;

          const section = sectionRef.current;
          const track = trackRef.current;
          if (!section || !track) return;

          // ÚNICA fuente de verdad de la distancia horizontal — la usan
          // `end` Y el tween. Mide el DOM ya layouteado: el ancho de cada
          // frame sale de `aspect-ratio` (CSS), nunca del tamaño intrínseco
          // de la imagen, así que es correcto aunque la foto no haya
          // cargado (crítico con los slots A3 actuales).
          const getDistance = () => track.scrollWidth - section.clientWidth;

          const tween = gsap.to(track, {
            x: () => -getDistance(),
            ease: "none",
          });

          const st = ScrollTrigger.create({
            trigger: section,
            start: "top top",
            end: () => `+=${getDistance()}`,
            pin: true,
            pinSpacing: true, // reserva exactamente getDistance() px — sin esto, salto garantizado al despinear.
            anticipatePin: 1, // evita el frame de "snap" al ENTRAR al pin (incl. reingreso scrolleando hacia arriba).
            scrub: SCRUB.min, // 0.6 (tokens.ts) — nunca `true` (sin inercia).
            invalidateOnRefresh: true, // en resize, re-ejecuta getDistance() y el `x` del tween.
            animation: tween,
          });

          // Apaga el scroll nativo del track mientras el pin está activo:
          // dos mecanismos de scroll horizontal compitiendo a la vez
          // produce el salto que este diseño evita. gsap.context revierte
          // este `set` junto con el resto al desmontar/cambiar de media.
          gsap.set(track, { overflowX: "hidden" });

          return () => st.kill();
        },
      );

      return () => mm.revert();
    }, sectionRef);

    return () => ctx.revert();
  }, [looks.length]);

  return (
    <section
      ref={sectionRef}
      className={cn("relative", className)}
      aria-label="Lookbook"
    >
      <div
        ref={trackRef}
        // Hallazgo del integrador (axe `scrollable-region-focusable`, WCAG
        // 2.1.1/2.1.3): un contenedor con overflow horizontal necesita ser
        // alcanzable por teclado, no solo por mouse/touch/pin de scroll —
        // `tabIndex={0}` lo hace foco-able (con su propio `outline`, igual
        // que el resto de interactivos del proyecto) y las flechas del
        // navegador ya scrollean nativamente un elemento enfocado con
        // overflow-x, sin agregar `scrollTo` propio (§8).
        tabIndex={0}
        role="group"
        aria-label="Lookbook — desplazamiento horizontal"
        className="flex overflow-x-auto outline-none [-webkit-overflow-scrolling:touch] [scroll-snap-type:x_mandatory] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink"
      >
        {looks.map((look, i) => (
          <figure
            key={look.id}
            className="flex-none [scroll-snap-align:start]"
            style={{
              height: `${FRAME_HEIGHT_VH[i % FRAME_HEIGHT_VH.length]}vh`,
              aspectRatio: "3 / 4",
              marginRight:
                i < looks.length - 1
                  ? `${GAP_AFTER_VW[i % GAP_AFTER_VW.length]}vw`
                  : 0,
            }}
          >
            {look.imageSrc ? (
              <img
                src={look.imageSrc}
                alt={look.imageAlt}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center border border-line-2 bg-paper-2 p-4 text-center text-xs text-ink-4">
                A3 · fotografía de campaña pendiente · 3:4, lado largo
                &ge;3000px
              </div>
            )}
            {/* width:100% + truncate: el caption nunca ensancha el frame, así el ancho del track nunca depende del texto. */}
            <figcaption className="mt-2 flex w-full gap-2 truncate">
              <span className="tracking-caps-sm shrink-0 font-display text-xs text-ink-3">
                {look.number}
              </span>
              <span className="tracking-caps-sm truncate font-sans text-xs text-ink-2">
                {look.name}
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
