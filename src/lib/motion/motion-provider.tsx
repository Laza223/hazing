"use client";

import { useEffect, type ReactNode } from "react";
import gsap from "gsap";
import Lenis from "lenis";

import { LENIS_LERP } from "@/lib/motion/tokens";
import { useReducedMotion } from "@/lib/motion/use-reduced-motion";
import {
  ensureGsapPluginsRegistered,
  ScrollTrigger,
} from "@/lib/motion/scroll-trigger";

/**
 * MotionProvider — la única pieza de estado global del motion system
 * (docs/spec/05-direccion-arte.md §3.2). Registra los plugins de GSAP una sola
 * vez y monta Lenis.
 *
 * Lenis va SOLO en desktop con puntero fino y con `lerp` = LENIS_LERP (§8):
 * en táctil el scroll nativo no se toca, porque secuestrarlo es exactamente lo
 * que el brief prohíbe. Con `prefers-reduced-motion` no se monta nunca.
 *
 * El ticker de Lenis se conecta al de GSAP (y no a su propio
 * `requestAnimationFrame`) para que el scrub de ScrollTrigger y la inercia
 * queden en el mismo frame — si corren en dos loops distintos, el scrub va
 * un frame atrás y se ve como micro-jitter.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    ensureGsapPluginsRegistered();

    // `limitCallbacks` agrupa los callbacks de ScrollTrigger a un disparo por
    // frame en vez de uno por evento de scroll: menos trabajo en el hilo
    // principal durante el scroll, que es donde la medición de 5.4 encontró
    // tareas por encima del target de 200 ms del §10.
    ScrollTrigger.config({ limitCallbacks: true, ignoreMobileResize: true });

    if (reducedMotion) return;
    // El §8 lo acota a desktop con puntero fino: nada de inercia en táctil.
    const mql = window.matchMedia("(min-width: 1024px) and (pointer: fine)");
    if (!mql.matches) return;

    const lenis = new Lenis({ lerp: LENIS_LERP });

    const update = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(update);
    // Sin lag smoothing: con scrub, el "recuperar" frames perdidos produce
    // saltos en vez de suavizar.
    gsap.ticker.lagSmoothing(0);
    lenis.on("scroll", ScrollTrigger.update);

    return () => {
      lenis.off("scroll", ScrollTrigger.update);
      gsap.ticker.remove(update);
      lenis.destroy();
    };
  }, [reducedMotion]);

  return <>{children}</>;
}
