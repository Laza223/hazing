import gsap from "gsap";

import { DURATION, EASE, STAGGER } from "@/lib/motion/tokens";

/**
 * Las CUATRO primitivas de motion del sistema
 * (docs/spec/05-direccion-arte.md §8: "las únicas cuatro; todo se compone con
 * ellas"). Antes cada componente reimplementaba a mano la misma secuencia con
 * los números repetidos, y `lineDraw` directamente no existía — dos hallazgos
 * de la medición de la sub-fase 5.4.
 *
 * Todas devuelven un tween/timeline PAUSADO: quien las usa decide si lo
 * reproduce directo o lo ata a un ScrollTrigger. Ninguna toca el scroll ni
 * registra plugins: eso es responsabilidad del MotionProvider.
 */

export interface PrimitiveOptions {
  duration?: number;
  ease?: string;
  delay?: number;
  stagger?: number;
}

export type MaskDirection = "left" | "right" | "top" | "bottom";

const HIDDEN_INSET: Record<MaskDirection, string> = {
  // Desde dónde se descubre: "left" = la máscara arranca cerrada a la
  // izquierda y el contenido aparece hacia la derecha.
  left: "inset(0 100% 0 0)",
  right: "inset(0 0 0 100%)",
  top: "inset(0 0 100% 0)",
  bottom: "inset(100% 0 0 0)",
};

const VISIBLE_INSET = "inset(0% 0% 0% 0%)";

/**
 * `maskReveal` — descubre un elemento con `clip-path`, sin mover ni escalar
 * nada. Es el gesto de entrada de la marca y del menú fullscreen.
 */
export function maskReveal(
  target: gsap.TweenTarget,
  {
    direction = "left",
    ...options
  }: PrimitiveOptions & { direction?: MaskDirection } = {},
): gsap.core.Tween {
  return gsap.fromTo(
    target,
    { clipPath: HIDDEN_INSET[direction] },
    {
      clipPath: VISIBLE_INSET,
      duration: options.duration ?? DURATION.overlay,
      ease: options.ease ?? EASE.outExpo,
      delay: options.delay ?? 0,
      stagger: options.stagger,
      paused: true,
    },
  );
}

/** `fadeUp` — opacidad 0→1 con 12px de desplazamiento. Entrada de texto y de bloques. */
export function fadeUp(
  target: gsap.TweenTarget,
  options: PrimitiveOptions = {},
): gsap.core.Tween {
  return gsap.fromTo(
    target,
    { autoAlpha: 0, y: 12 },
    {
      autoAlpha: 1,
      y: 0,
      duration: options.duration ?? DURATION.ui,
      ease: options.ease ?? EASE.outExpo,
      delay: options.delay ?? 0,
      stagger: options.stagger ?? STAGGER.max,
      paused: true,
    },
  );
}

/** `imageSettle` — la imagen entra levemente ampliada y se asienta (scale 1.06 → 1). */
export function imageSettle(
  target: gsap.TweenTarget,
  options: PrimitiveOptions = {},
): gsap.core.Tween {
  return gsap.fromTo(
    target,
    { scale: 1.06 },
    {
      scale: 1,
      // §8 fija esta primitiva en 900ms — más lenta que `--dur-image`, es la
      // "velocidad diferencial" que se percibe como cara.
      duration: options.duration ?? 0.9,
      ease: options.ease ?? EASE.cinema,
      delay: options.delay ?? 0,
      stagger: options.stagger,
      paused: true,
    },
  );
}

/** `lineDraw` — una regla se dibuja de izquierda a derecha (`scaleX` 0 → 1). */
export function lineDraw(
  target: gsap.TweenTarget,
  options: PrimitiveOptions = {},
): gsap.core.Tween {
  return gsap.fromTo(
    target,
    { scaleX: 0, transformOrigin: "left center" },
    {
      scaleX: 1,
      duration: options.duration ?? DURATION.overlay,
      ease: options.ease ?? EASE.outExpo,
      delay: options.delay ?? 0,
      stagger: options.stagger,
      paused: true,
    },
  );
}
