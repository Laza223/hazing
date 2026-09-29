"use client";

import { useLayoutEffect, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";

import { cn } from "@/lib/utils";
import { SCRUB } from "@/lib/motion/tokens";
import {
  ensureGsapPluginsRegistered,
  ScrollTrigger,
} from "@/lib/motion/scroll-trigger";

/**
 * Lookbook de la home: una fila de fotos 3:4 del mismo alto.
 *
 * - Desktop con movimiento: la sección se pinea y la fila avanza en
 *   horizontal con el scroll vertical (GSAP ScrollTrigger, scrub).
 * - Mobile o `prefers-reduced-motion`: scroll horizontal nativo con snap.
 *
 * Sin links por foto: en el track pineado un link fuera de pantalla no se
 * puede alcanzar con Tab sin forzar un `scrollTo` (§8).
 */
export interface LookbookLook {
  id: string;
  /** "01".."08" — provisto por el caller, no autogenerado. */
  number: string;
  /** Nombre de la prenda. */
  name: string;
  imageSrc: string;
  imageAlt: string;
}

export interface LookbookProps {
  looks: LookbookLook[];
  title?: string;
  className?: string;
}

export function Lookbook({
  looks,
  title = "Lookbook",
  className,
}: LookbookProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    ensureGsapPluginsRegistered();

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      // Solo desktop con movimiento completo. Con movimiento reducido o en
      // mobile queda el scroll horizontal nativo del viewport (§4.1, §9, §11).
      mm.add(
        {
          pinnable:
            "(min-width: 1024px) and (prefers-reduced-motion: no-preference)",
        },
        (ctxCond) => {
          const { pinnable } = ctxCond.conditions as { pinnable: boolean };
          if (!pinnable) return;

          const section = sectionRef.current;
          const viewport = viewportRef.current;
          const track = trackRef.current;
          if (!section || !viewport || !track) return;

          // Se mueve la fila (`track`), nunca el contenedor que recorta
          // (`viewport`): si se traslada el propio contenedor con overflow,
          // su recorte viaja con él y los últimos looks nunca entran en
          // pantalla. El ancho de cada foto sale de `aspect-ratio`, así que
          // la distancia es correcta aunque las imágenes no hayan cargado.
          const getDistance = () =>
            Math.max(0, track.scrollWidth - viewport.clientWidth);

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

          // Con el pin activo no puede haber además scroll nativo: dos
          // mecanismos compitiendo producen saltos. gsap.context revierte el
          // `set` al desmontar o al cambiar de media query.
          gsap.set(viewport, { overflowX: "hidden", scrollSnapType: "none" });
          viewport.scrollLeft = 0;

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
      id="lookbook"
      className={cn(
        "relative flex flex-col justify-center bg-paper py-16 lg:h-[100svh] lg:pb-10 lg:pt-24",
        className,
      )}
      aria-label="Lookbook"
    >
      <div className="mb-6 flex items-baseline justify-between gap-4 px-4 md:px-10 lg:mb-8">
        <h2 className="tracking-caps-sm text-xs font-medium uppercase text-ink">
          {title}
        </h2>
        <p className="tracking-caps-sm text-xs uppercase tabular-nums text-ink-3">
          {String(looks.length).padStart(2, "0")} looks
        </p>
      </div>
      <div
        ref={viewportRef}
        // `tabIndex={0}`: un contenedor con overflow horizontal tiene que ser
        // alcanzable por teclado (axe `scrollable-region-focusable`); las
        // flechas del navegador lo scrollean de forma nativa.
        tabIndex={0}
        role="group"
        aria-label="Lookbook — desplazamiento horizontal"
        className="snap-x snap-mandatory scroll-px-4 overflow-x-auto overflow-y-hidden outline-none [scrollbar-width:none] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink md:scroll-px-10 [&::-webkit-scrollbar]:hidden"
      >
        <div ref={trackRef} className="flex w-max gap-3 px-4 md:gap-6 md:px-10">
          {looks.map((look) => (
            <figure
              key={look.id}
              className="w-[72vw] flex-none snap-start md:w-[38vw] lg:w-auto"
            >
              <div className="relative aspect-[3/4] overflow-hidden bg-paper-2 lg:h-[calc(100svh-15rem)]">
                <Image
                  fill
                  sizes="(min-width: 1024px) 30vw, (min-width: 768px) 38vw, 72vw"
                  src={look.imageSrc}
                  alt={look.imageAlt}
                  className="object-cover"
                />
              </div>
              <figcaption className="mt-3 flex gap-3 text-xs">
                <span className="tabular-nums text-ink-3">{look.number}</span>
                <span className="text-ink">{look.name}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
