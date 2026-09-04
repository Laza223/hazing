"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

import {
  canRunSignatureMomentScene,
  probeWebgl,
  type NavigatorWithMemory,
} from "@/components/immersive/capability";
import { useReducedMotion } from "@/lib/motion/use-reduced-motion";
import { SignatureMomentFallback } from "@/components/immersive/signature-moment-fallback";
import { SceneErrorBoundary } from "@/components/immersive/scene-error-boundary";

/**
 * Punto de montaje del momento inmersivo "La etiqueta" — ÚNICO archivo que
 * la home importa (docs/spec/05-direccion-arte.md §6).
 *
 * Progressive enhancement, no gate-then-render-nothing: el still accesible
 * (`SignatureMomentFallback`) es la BASE que se sirve desde el HTML del
 * servidor — §11 exige que el contenido viva en el HTML del servidor, y §6
 * que la sección nunca desaparezca. La escena 3D lo REEMPLAZA solo cuando el
 * dispositivo es capaz y la sección está cerca. Sin JS, con JS lento, o con
 * WebGL roto, siempre queda el still con su tipografía.
 *
 * Carga: `next/dynamic` con `ssr: false` (NO un `import()` pelado). Un
 * `import()` plano igual queda trazado por el compilador de servidor de Next
 * y mete three.js en `.next/server/**` — verificado en la revisión
 * adversarial de 5.3 con `grep -rl WebGLRenderer .next/server`, y es
 * exactamente lo que hace fallar el gate de CI del ADR 0003. El chunk no se
 * pide a la red hasta que este componente se renderiza, así que el gate de
 * capacidad + IntersectionObserver siguen valiendo cero bytes.
 */
const SignatureMomentSceneLazy = dynamic(
  () => import("@/components/immersive/signature-moment-scene"),
  { ssr: false },
);

type ScenePhase = "still" | "scene";

export function SignatureMoment(): React.JSX.Element {
  const [phase, setPhase] = useState<ScenePhase>("still");
  const rootRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const webglAvailable = probeWebgl();
    const nav = navigator as NavigatorWithMemory;
    const capable = canRunSignatureMomentScene({
      prefersReducedMotion: reducedMotion,
      deviceMemory: nav.deviceMemory,
      webglAvailable,
    });

    // Dispositivo incapaz: el still ya está renderizado, no hay nada que hacer
    // y no se pide un solo byte del chunk de three.
    if (!capable) {
      setPhase("still");
      return;
    }

    const el = rootRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        // `rootMargin: "200%"` expande el área de detección a ~2 viewports:
        // entrar = precargar y montar la escena; salir = la sección quedó a
        // más de 2 viewports, se desmonta el <Canvas> y se libera el contexto
        // WebGL, volviendo al still.
        setPhase(entry.isIntersecting ? "scene" : "still");
      },
      { rootMargin: "200%" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reducedMotion]);

  return (
    // Reserva de layout — evita CLS al alternar entre still y escena.
    <div ref={rootRef} className="min-h-[100svh]">
      {phase === "scene" ? (
        <SceneErrorBoundary fallback={<SignatureMomentFallback />}>
          <SignatureMomentSceneLazy />
        </SceneErrorBoundary>
      ) : (
        <SignatureMomentFallback />
      )}
    </div>
  );
}
