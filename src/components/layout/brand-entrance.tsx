"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

import { useReducedMotion } from "@/lib/motion/use-reduced-motion";
import { EASE } from "@/lib/motion/tokens";
import { Wordmark } from "@/components/brand/wordmark";

const STORAGE_KEY = "hazing:brand-entrance-seen";

/**
 * BrandEntrance — beat 1 de la coreografía de home
 * (docs/spec/05-direccion-arte.md §4). Solo la primera vez por sesión:
 * revela el wordmark con `clip-path` y hace fade-out del overlay completo.
 *
 * TODO(5.1 follow-up): el FLIP hacia la posición del wordmark en el header
 * (docs/spec/05-direccion-arte.md §4 beat 1) queda para una iteración
 * futura — esta tarea solo implementa el reveal + fade-out del overlay.
 */
export function BrandEntrance() {
  const [visible, setVisible] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);
  const wordmarkRef = useRef<SVGSVGElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (window.sessionStorage.getItem(STORAGE_KEY)) return;
    setVisible(true);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const wordmark = wordmarkRef.current;
    const overlay = overlayRef.current;
    if (!wordmark || !overlay) return;

    const finish = () => {
      window.sessionStorage.setItem(STORAGE_KEY, "1");
      setVisible(false);
    };

    if (reducedMotion) {
      const tween = gsap.to(overlay, {
        opacity: 0,
        duration: 0.15,
        ease: EASE.ui,
        onStart: () => setFadingOut(true),
        onComplete: finish,
      });
      return () => {
        tween.kill();
      };
    }

    // El total tiene que quedar en ≤ 700 ms (§9). Medido en runtime, la
    // versión anterior (0.45 + 0.1 + 0.25) daba 822-839 ms: el hold y el
    // fade se recortan y el reveal, que es el gesto de marca, se conserva.
    const tl = gsap.timeline({ onComplete: finish });
    tl.fromTo(
      wordmark,
      { clipPath: "inset(0 100% 0 0)" },
      { clipPath: "inset(0 0% 0 0)", duration: 0.45, ease: EASE.outExpo },
    );
    tl.to({}, { duration: 0.05 }); // hold breve
    tl.to(overlay, {
      opacity: 0,
      duration: 0.2,
      ease: EASE.ui,
      onStart: () => setFadingOut(true),
    });

    return () => {
      tl.kill();
    };
  }, [visible, reducedMotion]);

  if (!visible) return null;

  return (
    <div
      ref={overlayRef}
      aria-hidden="true"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-paper"
      style={{ pointerEvents: fadingOut ? "none" : "auto" }}
    >
      <Wordmark ref={wordmarkRef} className="h-16 w-auto md:h-24" />
    </div>
  );
}
