"use client";

import { useEffect, type RefObject } from "react";
import gsap from "gsap";

import { DURATION, EASE, STAGGER } from "@/lib/motion/tokens";
import { useReducedMotion } from "@/lib/motion/use-reduced-motion";
import {
  ensureGsapPluginsRegistered,
  ScrollTrigger,
} from "@/lib/motion/scroll-trigger";

/**
 * Entrada de contenido al scrollear: los `[data-reveal-item]` dentro de
 * `containerRef` suben 12px y aparecen, en cascada, una sola vez cuando el
 * contenedor entra al 85% del viewport. Con `prefers-reduced-motion` quedan
 * visibles desde el principio.
 */
export function useReveal(
  containerRef: RefObject<HTMLElement | null>,
  stagger: number = STAGGER.max,
): void {
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const items = container.querySelectorAll<HTMLElement>("[data-reveal-item]");
    if (items.length === 0) return;

    if (reducedMotion) {
      gsap.set(items, { clearProps: "opacity,transform" });
      return;
    }

    ensureGsapPluginsRegistered();
    gsap.set(items, { opacity: 0, y: 12 });
    const trigger = ScrollTrigger.create({
      trigger: container,
      start: "top 85%",
      once: true,
      onEnter: () => {
        gsap.to(items, {
          opacity: 1,
          y: 0,
          duration: DURATION.image,
          ease: EASE.outExpo,
          stagger,
        });
      },
    });

    return () => {
      trigger.kill();
      gsap.set(items, { clearProps: "opacity,transform" });
    };
  }, [containerRef, reducedMotion, stagger]);
}
