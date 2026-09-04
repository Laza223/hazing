"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Canvas } from "@react-three/fiber";
import gsap from "gsap";

import { ensureGsapPluginsRegistered } from "@/lib/motion/scroll-trigger";
import { EASE, SCRUB } from "@/lib/motion/tokens";
import {
  INITIAL_SCENE_STATE,
  SIGNATURE_MOMENT_KEYFRAMES,
  type SceneState,
} from "@/lib/motion/scene-state";
import { SceneContents } from "@/components/immersive/scene-contents";
import {
  BRAND_STATEMENT,
  SIGNATURE_MOMENT_LABEL,
  SIGNATURE_MOMENT_TAG_BACK,
} from "@/lib/content/copy";

/**
 * Escena real del momento inmersivo "La etiqueta"
 * (docs/spec/05-direccion-arte.md §6). Módulo dinámico — único punto,
 * junto con scene-contents.tsx/tag-assembly.tsx, con permiso de importar
 * `@react-three/fiber`/`@react-three/drei`/`three` (docs/decisions/0003-motion-y-3d.md).
 * `signature-moment.tsx` lo carga vía `import()` SOLO cuando el dispositivo
 * es capaz (`canRunSignatureMomentScene`).
 */

// camZ/tagRotY/pendulumAmplitude los lee la cámara/etiqueta 3D (ease cinema);
// keyIntensity/keyX/rimIntensity/rimX las luces (ease ui). fadeToPaper NO se
// tween-ea acá: el fundido final es un tween DOM directo sobre fadeOverlayRef.
const CAMERA_TAG_KEYS = ["camZ", "tagRotY", "pendulumAmplitude"] as const;
const LIGHT_KEYS = ["keyIntensity", "keyX", "rimIntensity", "rimX"] as const;

/** Estado acumulado (cada keyframe hereda lo no declarado del anterior) — usado por el timeline y por el debug `?stillProgress=`. */
const CUMULATIVE_STATES: readonly SceneState[] = (() => {
  let current: SceneState = { ...INITIAL_SCENE_STATE };
  return SIGNATURE_MOMENT_KEYFRAMES.map((kf) => {
    current = { ...current, ...kf.state };
    return current;
  });
})();

/** Interpola linealmente entre los dos keyframes que encierran `p` (solo para el debug `?stillProgress=`, no se usa en el timeline real). */
function interpolateSceneStateAt(p: number): SceneState {
  const kfs = SIGNATURE_MOMENT_KEYFRAMES;
  const clamped = Math.min(Math.max(p, kfs[0]!.p), kfs[kfs.length - 1]!.p);

  for (let i = 1; i < kfs.length; i++) {
    const prevKf = kfs[i - 1]!;
    const kf = kfs[i]!;
    if (clamped <= kf.p) {
      const span = kf.p - prevKf.p;
      const t = span === 0 ? 1 : (clamped - prevKf.p) / span;
      const prevState = CUMULATIVE_STATES[i - 1]!;
      const nextState = CUMULATIVE_STATES[i]!;
      const result = { ...prevState };
      (Object.keys(prevState) as (keyof SceneState)[]).forEach((key) => {
        result[key] = prevState[key] + (nextState[key] - prevState[key]) * t;
      });
      return result;
    }
  }
  return CUMULATIVE_STATES[CUMULATIVE_STATES.length - 1]!;
}

function pick<T extends readonly (keyof SceneState)[]>(
  state: Partial<SceneState>,
  keys: T,
): Partial<SceneState> {
  const result: Partial<SceneState> = {};
  for (const key of keys) {
    if (state[key] !== undefined) result[key] = state[key];
  }
  return result;
}

export default function SignatureMomentScene(): React.JSX.Element {
  const sectionRef = useRef<HTMLElement>(null);
  const labelRef = useRef<HTMLParagraphElement>(null);
  const dorsoOverlayRef = useRef<HTMLParagraphElement>(null);
  const statementRef = useRef<HTMLParagraphElement>(null);
  const fadeOverlayRef = useRef<HTMLDivElement>(null);
  const sceneStateRef = useRef<SceneState>({ ...INITIAL_SCENE_STATE });
  const [isDesktop, setIsDesktop] = useState(false);

  const searchParams = useSearchParams();
  // Debug dev-only — se poda en build de producción por dead-code elimination
  // sobre este `if`.
  const stillProgressParam =
    process.env.NODE_ENV !== "production"
      ? searchParams.get("stillProgress")
      : null;

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    if (stillProgressParam !== null) {
      const p = Number(stillProgressParam);
      if (!Number.isNaN(p)) {
        sceneStateRef.current = interpolateSceneStateAt(p);
        if (labelRef.current)
          labelRef.current.style.opacity = p <= 0.1 ? String(1 - p / 0.1) : "0";
        const dorsoVisible = p >= 0.3 && p <= 0.7;
        if (dorsoOverlayRef.current) {
          dorsoOverlayRef.current.style.opacity = dorsoVisible ? "1" : "0";
        }
        const statementVisible = p >= 0.65 && p < 0.9;
        if (statementRef.current) {
          statementRef.current.style.opacity = statementVisible ? "1" : "0";
        }
        if (fadeOverlayRef.current) {
          fadeOverlayRef.current.style.opacity =
            p >= 0.9 ? String((p - 0.9) / 0.1) : "0";
        }
      }
      return;
    }

    ensureGsapPluginsRegistered();

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add(
        {
          isDesktopQuery: "(min-width: 1024px) and (pointer: fine)",
          isMobileQuery: "(max-width: 1023px), (pointer: coarse)",
        },
        (context) => {
          const matchedDesktop = context.conditions?.isDesktopQuery ?? false;
          setIsDesktop(matchedDesktop);

          const tl = gsap.timeline({
            scrollTrigger: matchedDesktop
              ? {
                  trigger: section,
                  start: "top top",
                  end: "+=300%",
                  pin: true,
                  scrub: SCRUB.max,
                }
              : {
                  trigger: section,
                  start: "top bottom",
                  end: "bottom top",
                  pin: false,
                  scrub: SCRUB.max,
                },
          });

          // Tweens de sceneState (cámara/etiqueta/luces), un tramo por
          // keyframe (excepto p=0, el estado inicial ya aplicado).
          let prevP = SIGNATURE_MOMENT_KEYFRAMES[0]!.p;
          for (const kf of SIGNATURE_MOMENT_KEYFRAMES.slice(1)) {
            const duration = kf.p - prevP;
            const cameraTagProps = pick(kf.state, CAMERA_TAG_KEYS);
            const lightProps = pick(kf.state, LIGHT_KEYS);

            if (Object.keys(cameraTagProps).length > 0) {
              tl.to(
                sceneStateRef.current,
                { ...cameraTagProps, duration, ease: EASE.cinema },
                prevP,
              );
            }
            if (Object.keys(lightProps).length > 0) {
              tl.to(
                sceneStateRef.current,
                { ...lightProps, duration, ease: EASE.ui },
                prevP,
              );
            }
            prevP = kf.p;
          }

          // Overlays DOM — mismo timeline, mismos `p`.
          if (labelRef.current) {
            tl.fromTo(
              labelRef.current,
              { opacity: 1 },
              { opacity: 0, duration: 0.1, ease: EASE.ui },
              0,
            );
          }
          if (dorsoOverlayRef.current) {
            tl.fromTo(
              dorsoOverlayRef.current,
              { opacity: 0 },
              { opacity: 1, duration: 0.05, ease: EASE.ui },
              0.3,
            ).to(
              dorsoOverlayRef.current,
              { opacity: 0, duration: 0.05, ease: EASE.ui },
              0.65,
            );
          }
          if (statementRef.current) {
            tl.fromTo(
              statementRef.current,
              { opacity: 0 },
              { opacity: 1, duration: 0.05, ease: EASE.ui },
              0.6,
            ).to(
              statementRef.current,
              { opacity: 0, duration: 0.1, ease: EASE.ui },
              0.9,
            );
          }
          if (fadeOverlayRef.current) {
            tl.to(
              fadeOverlayRef.current,
              { opacity: 1, duration: 0.1, ease: EASE.cinema },
              0.9,
            );
          }
        },
      );
    }, section);

    return () => ctx.revert();
  }, [stillProgressParam]);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[100svh] overflow-hidden bg-ink text-paper"
    >
      <Canvas
        dpr={isDesktop ? [1, 1.5] : [1, 1]}
        shadows={isDesktop}
        gl={{ alpha: true }}
        className="!absolute inset-0"
      >
        <SceneContents sceneState={sceneStateRef} isDesktop={isDesktop} />
      </Canvas>

      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4 md:p-10">
        <p
          ref={labelRef}
          className="tracking-caps-sm font-sans text-xs uppercase text-paper"
        >
          {SIGNATURE_MOMENT_LABEL}
        </p>

        {/* Dorso accesible — nodo DOM real en paralelo a la textura
            decorativa del mesh (§11): mismo copy.ts que la textura de
            use-canvas-textures.ts, sin duplicar mantenimiento. */}
        <p
          ref={dorsoOverlayRef}
          style={{ opacity: 0 }}
          className="tracking-caps-sm text-center font-display text-xs uppercase text-paper md:text-sm"
        >
          {`HAZING — ${SIGNATURE_MOMENT_TAG_BACK.origin} — ${SIGNATURE_MOMENT_TAG_BACK.sizeColorLabel} — ${SIGNATURE_MOMENT_TAG_BACK.exampleOrderNumber}`}
        </p>

        <p
          ref={statementRef}
          style={{ opacity: 0 }}
          className="tracking-caps-lg max-w-2xl font-display text-3xl uppercase text-paper md:text-5xl"
        >
          {BRAND_STATEMENT}
        </p>
      </div>

      <div
        ref={fadeOverlayRef}
        style={{ opacity: 0 }}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-paper"
      />
    </section>
  );
}
