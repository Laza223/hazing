"use client";

import { useEffect } from "react";
import gsap from "gsap";
import Lenis from "lenis";

import { LENIS_LERP } from "@/lib/motion/tokens";
import { ScrollTrigger } from "@/lib/motion/scroll-trigger";

/**
 * Lenis montado. Único módulo que importa `lenis`, y solo se carga con
 * `next/dynamic(..., { ssr: false })` desde `MotionProvider`, cuando ya se
 * decidió que corresponde (desktop, puntero fino, sin reduced motion).
 *
 * Por qué un componente aparte y no un `import` en el provider: un import
 * estático mete Lenis en el bundle de SSR del layout (medido: `lenis-smooth`
 * en `.next/server/chunks/*`, gate de CI del ADR 0003), y un `import()` pelado
 * también queda trazado por el compilador de servidor. `next/dynamic` con
 * `ssr: false` es la frontera que ya se verificó con three.js en 5.3. Además,
 * mobile y táctil no descargan Lenis nunca.
 *
 * El ticker de Lenis se conecta al de GSAP (y no a su propio
 * `requestAnimationFrame`) para que el scrub de ScrollTrigger y la inercia
 * queden en el mismo frame — si corren en dos loops distintos, el scrub va
 * un frame atrás y se ve como micro-jitter.
 */
export default function LenisScroller(): null {
  useEffect(() => {
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
  }, []);

  return null;
}
