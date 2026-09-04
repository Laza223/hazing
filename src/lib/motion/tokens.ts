/**
 * Motion system — fuente de verdad en JS para GSAP/Flip/Lenis.
 *
 * MISMOS valores que las custom properties --dur- y --ease- de
 * src/app/globals.css — si se cambia acá, cambiar también ahí. CSS gobierna
 * hover/focus/estado; estos tokens gobiernan todo lo secuenciado por GSAP.
 * Ver docs/spec/05-direccion-arte.md §8 y docs/decisions/0003-motion-y-3d.md.
 */

export const DURATION = {
  /** color, borde, opacidad en hover/focus */
  micro: 0.15,
  /** botones, swatches, ítems de menú */
  ui: 0.25,
  /** menú, drawer de carrito */
  overlay: 0.45,
  /** crossfade de imagen, swap de tile */
  image: 0.7,
  /** hero, transición hero → comercio */
  cinema: 1.2,
} as const;

export const EASE = {
  /** micro y UI */
  ui: "cubic-bezier(0.4, 0, 0.2, 1)",
  /** máscaras, reveals, menú */
  outExpo: "cubic-bezier(0.16, 1, 0.3, 1)",
  /** movimientos de imagen y cámara */
  cinema: "cubic-bezier(0.65, 0, 0.35, 1)",
} as const;

/** Stagger entre ítems de una entrada compuesta (menú, grillas). En segundos. */
export const STAGGER = {
  min: 0.04,
  max: 0.06,
} as const;

/** scrub recomendado para animaciones ligadas al scroll — el retraso es lo
 * que se percibe como peso (§8). Nunca `true` (sin inercia) ni sin scrub. */
export const SCRUB = {
  min: 0.6,
  max: 1,
} as const;

/** `lerp` de Lenis — solo desktop con puntero fino, nunca en táctil (§8). */
export const LENIS_LERP = 0.09;
