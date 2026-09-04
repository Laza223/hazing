"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { Flip } from "gsap/Flip";

import { SCRUB } from "@/lib/motion/tokens";
import { useReducedMotion } from "@/lib/motion/use-reduced-motion";
import {
  ensureGsapPluginsRegistered,
  ScrollTrigger,
} from "@/lib/motion/scroll-trigger";
import { useHomeSequenceState } from "@/components/home/home-sequence-context";

/** Recorrido del beat 3 — tabla del §4: "scrub, 60vh de recorrido". */
const SPACER_HEIGHT_VH = 60;

let flipRegistered = false;
/**
 * Registro de Flip separado de `ensureGsapPluginsRegistered` (que solo
 * registra ScrollTrigger, en src/lib/motion/scroll-trigger.ts — fuera del
 * alcance de esta tarea). Mismo patrón: idempotente, solo dentro de un
 * efecto (docs/decisions/0003-motion-y-3d.md: "el registro de plugins
 * ocurre en un useEffect... no a nivel de módulo").
 */
function ensureFlipRegistered(): void {
  if (flipRegistered) return;
  gsap.registerPlugin(Flip);
  flipRegistered = true;
}

/**
 * HeroToCommerce — beat 3 de la coreografía de home (docs/spec/05-direccion-arte.md
 * §4: "Hero → comercio"). Se monta UNA vez a nivel de página, entre `<Hero />`
 * y `<NewIn />`, dentro de un `HomeSequenceProvider`. No recibe props: todo
 * lo que necesita (si hay imagen clave, los nodos del DOM) sale del contexto
 * compartido (src/components/home/home-sequence-context.tsx, fuera del
 * alcance de esta tarea — API esperada documentada ahí).
 *
 * Dos piezas, siempre atadas al mismo tramo de scroll (el spacer de 60vh
 * que este componente renderiza, `[data-hero-commerce-spacer]`):
 *
 * 1. **Cortina** (Modo B, siempre activa): un panel `paper` dentro del propio
 *    spacer (documento normal, NO fixed) que se descubre de abajo hacia
 *    arriba via `clip-path`. Como vive en el flujo normal, al scrollear más
 *    allá simplemente sale de pantalla como cualquier contenido — sin riesgo
 *    de quedar "pegada" cubriendo la página (a diferencia de un overlay
 *    `fixed`, que sí necesitaría reaparecer/desaparecer con cuidado).
 * 2. **Flight** (Modo A, solo si `flightEnabled`): un clon visual de la
 *    imagen clave del hero, montado en un portal `fixed` a nivel de body,
 *    que GSAP Flip anima desde la posición real de `heroKeyImage` hasta la
 *    posición real de `firstTileImage` (medida en vivo, nunca hardcodeada).
 *    El clon SOLO existe mientras el spacer está en su rango activo
 *    (`onEnter`/`onLeave` de un ScrollTrigger dedicado) — es la única forma
 *    de evitar que, al ser `position: fixed`, quede "flotando" sobre la
 *    pantalla durante todo el scroll del hero (beat 2) o de NEW IN en
 *    adelante. Esto es una simplificación deliberada frente al pseudocódigo
 *    original del plan de la sub-fase (que ata todo a `.set()` en progreso
 *    puro sin depender de callbacks): un clon `fixed` creado de una sola vez
 *    al montar el componente aplicaría su frame 0 inmediatamente y de forma
 *    permanente mientras el scroll no alcance el spacer, dejando una imagen
 *    fantasma inmóvil sobre el viewport durante todo el beat 2. Mount/unmount
 *    por `onEnter`/`onLeave` evita ese bug a costa de perder la reversibilidad
 *    "pura por progreso" en los bordes exactos del rango — riesgo real,
 *    pendiente de validar con verificación-ux contra un build corriendo.
 */
export function HeroToCommerce() {
  const reducedMotion = useReducedMotion();
  const { flightEnabled, nodes } = useHomeSequenceState();
  const spacerRef = useRef<HTMLDivElement>(null);
  const curtainRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => setPortalReady(true), []);

  // Cortina — Modo B, común a los dos modos (§4 beat 3: "mientras el resto
  // se descubre con máscara horizontal", presente también en Modo A).
  useEffect(() => {
    const spacer = spacerRef.current;
    const curtain = curtainRef.current;
    if (!spacer || !curtain) return;

    if (reducedMotion) {
      // Reduced motion: sin cortina, sin recorrido — la sección de abajo
      // (NEW IN) ya nace visible, no hay nada que revelar (§8).
      return;
    }

    ensureGsapPluginsRegistered();

    // `ScrollTrigger.create({ animation })` en vez del atajo con
    // `scrollTrigger:` inline en el tween: los tipos de gsap 3.15 no
    // declaran `.scrollTrigger` en la instancia devuelta, así que el
    // cleanup necesita la referencia explícita al trigger creado.
    // Wipe de ABAJO hacia ARRIBA (§4 beat 3, modo sin imagen clave): se anima
    // el `top` del inset de 100% → 0%, que ancla el área visible al borde
    // inferior y la hace crecer hacia arriba. Animar el `bottom` (como estaba)
    // ancla arriba y descubre hacia abajo — el sentido contrario al del brief.
    gsap.set(curtain, { clipPath: "inset(100% 0 0 0)" });
    const tween = gsap.to(curtain, {
      clipPath: "inset(0% 0 0 0)",
      ease: "none",
      duration: 1,
      paused: true,
    });
    const trigger = ScrollTrigger.create({
      trigger: spacer,
      start: "top top",
      end: "bottom top",
      scrub: SCRUB.max,
      animation: tween,
    });

    return () => {
      trigger.kill();
      tween.kill();
      gsap.set(curtain, { clearProps: "all" });
    };
  }, [reducedMotion]);

  // Flight — Modo A, solo con imagen clave y sin reduced motion. Depende de
  // `portalReady`: la capa fija vive en un portal (document.body, ver abajo)
  // que recién existe en el DOM después del primer render de cliente — sin
  // esta dependencia el efecto correría una vez con `layerRef.current` en
  // null (SSR) y nunca se volvería a ejecutar al aparecer el portal.
  useEffect(() => {
    const spacer = spacerRef.current;
    const layer = layerRef.current;
    if (!spacer || !layer) return;
    if (reducedMotion || !flightEnabled) return;

    ensureGsapPluginsRegistered();
    ensureFlipRegistered();

    let clone: HTMLDivElement | null = null;
    let flightTl: gsap.core.Timeline | null = null;
    // ScrollTrigger propio del vuelo, creado junto con el timeline: es el que
    // aporta el `scrub` real. Antes el progreso se copiaba a mano en el
    // `onUpdate` del trigger de ciclo de vida (`flightTl.progress(self.progress)`),
    // que equivale a `scrub: true` — sin inercia, y el §8 pide scrub 0.6-1
    // justamente porque "el retraso es lo que se percibe como peso".
    let flightTrigger: ScrollTrigger | null = null;

    function mount() {
      const heroEl = nodes.current.heroKeyImage;
      const tileEl = nodes.current.firstTileImage;
      if (!heroEl || !tileEl || !layer) return;

      unmount(); // por si quedó un clon de un enter/leave anterior sin limpiar

      const heroBox = heroEl.getBoundingClientRect();
      const node = document.createElement("div");
      node.setAttribute("aria-hidden", "true");
      node.className = heroEl.className;
      // innerHTML acá clona el propio markup de Hero (slot o <img> con la
      // URL de catálogo que ya renderizó React) para el clon visual del
      // Flip — no hay input de usuario en esta ruta.
      node.innerHTML = heroEl.innerHTML;
      layer.appendChild(node);
      clone = node;

      gsap.set(clone, {
        position: "fixed",
        margin: 0,
        top: heroBox.top,
        left: heroBox.left,
        width: heroBox.width,
        height: heroBox.height,
        visibility: "visible",
      });

      // Reconciliación 3:4 → 4:5 (§3.1 declara los dos ratios para
      // contextos distintos — hero vs. NEW IN — a propósito, no es un error
      // de diseño): Flip anima el FRAME (top/left/width/height,
      // `scale:false`), nunca un transform-scale uniforme. El contenido
      // interno (imagen o slot) ya usa `absolute inset-0 h-full w-full
      // object-cover` (mismo patrón que ProductTile), así que se recorta
      // solo cuando el frame cambia de proporción — sin lógica especial acá.
      const state = Flip.getState(clone);
      Flip.fit(clone, tileEl, { scale: false });

      flightTl = gsap.timeline({ paused: true });
      flightTl.add(
        Flip.from(state, {
          targets: clone,
          ease: "none",
          absolute: true,
          scale: false,
          duration: 1,
        }),
        0,
      );
      flightTl.set(heroEl, { autoAlpha: 0 }, 0);
      flightTl.set(tileEl, { autoAlpha: 1 }, ">-0.001");
      flightTl.set(clone, { visibility: "hidden" }, ">");

      flightTrigger = ScrollTrigger.create({
        trigger: spacer,
        start: "top top",
        end: "bottom top",
        scrub: SCRUB.max,
        animation: flightTl,
        invalidateOnRefresh: true,
      });
    }

    function unmount() {
      flightTrigger?.kill();
      flightTrigger = null;
      flightTl?.kill();
      flightTl = null;
      clone?.remove();
      clone = null;
      const heroEl = nodes.current.heroKeyImage;
      const tileEl = nodes.current.firstTileImage;
      if (heroEl) gsap.set(heroEl, { clearProps: "all" });
      if (tileEl) gsap.set(tileEl, { clearProps: "all" });
    }

    const driver = ScrollTrigger.create({
      trigger: spacer,
      start: "top top",
      end: "bottom top",
      invalidateOnRefresh: true,
      onEnter: mount,
      onEnterBack: mount,
      onLeave: unmount,
      onLeaveBack: unmount,
      onRefresh: () => {
        // Si el resize/carga de fuentes ocurre con el clon montado, se
        // reconstruye con las medidas nuevas en vez de dejarlo desalineado.
        // El progreso lo vuelve a aplicar el `scrub` del propio flightTrigger.
        if (clone) mount();
      },
    });

    return () => {
      driver.kill();
      unmount();
    };
  }, [reducedMotion, flightEnabled, nodes, portalReady]);

  return (
    <>
      <div
        ref={spacerRef}
        data-hero-commerce-spacer
        aria-hidden="true"
        className="relative w-full overflow-hidden"
        style={{ height: `${SPACER_HEIGHT_VH}vh` }}
      >
        <div ref={curtainRef} className="absolute inset-0 bg-paper" />
      </div>

      {/* Capa fija para el clon del Flip — por debajo del header (z-40,
          mix-blend-difference) y por encima de las secciones (§ "riesgos"
          del plan: si se agrega un drawer u otro overlay fixed, revisar
          z-index explícitamente, no asumir que z-30 alcanza para siempre). */}
      {portalReady
        ? createPortal(
            <div
              ref={layerRef}
              aria-hidden="true"
              className="pointer-events-none fixed inset-0 z-30"
            />,
            document.body,
          )
        : null}
    </>
  );
}
