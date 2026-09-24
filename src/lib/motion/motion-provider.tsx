"use client";

import { useEffect, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";

import { useReducedMotion } from "@/lib/motion/use-reduced-motion";
import {
  ensureGsapPluginsRegistered,
  ScrollTrigger,
} from "@/lib/motion/scroll-trigger";

/**
 * Lenis se carga solo en el cliente y solo cuando corresponde (ver
 * `lenis-scroller.tsx` para por qué no es un import directo).
 */
const LenisScrollerLazy = dynamic(() => import("@/lib/motion/lenis-scroller"), {
  ssr: false,
});

/**
 * MotionProvider — la única pieza de estado global del motion system
 * (docs/spec/05-direccion-arte.md §3.2). Registra los plugins de GSAP una sola
 * vez y decide si monta Lenis.
 *
 * Lenis va SOLO en desktop con puntero fino (§8): en táctil el scroll nativo
 * no se toca, porque secuestrarlo es exactamente lo que el brief prohíbe. Con
 * `prefers-reduced-motion` no se monta nunca.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  const reducedMotion = useReducedMotion();
  const [lenisEnabled, setLenisEnabled] = useState(false);

  useEffect(() => {
    ensureGsapPluginsRegistered();

    // `limitCallbacks` agrupa los callbacks de ScrollTrigger a un disparo por
    // frame en vez de uno por evento de scroll: menos trabajo en el hilo
    // principal durante el scroll, que es donde la medición de 5.4 encontró
    // tareas por encima del target de 200 ms del §10.
    ScrollTrigger.config({ limitCallbacks: true, ignoreMobileResize: true });

    // El §8 lo acota a desktop con puntero fino: nada de inercia en táctil.
    const mql = window.matchMedia("(min-width: 1024px) and (pointer: fine)");
    setLenisEnabled(!reducedMotion && mql.matches);
  }, [reducedMotion]);

  return (
    <>
      {lenisEnabled && <LenisScrollerLazy />}
      {children}
    </>
  );
}
