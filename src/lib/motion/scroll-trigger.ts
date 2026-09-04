import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Único punto de registro de plugins gsap del proyecto (docs/decisions/0003-motion-y-3d.md:
 * "el registro de plugins ocurre en un useEffect... no a nivel de módulo").
 * Un futuro MotionProvider (5.2+) reusa esta función en vez de duplicar el
 * registro.
 */
let registered = false;

/** Idempotente. Llamar SOLO dentro de un useEffect, nunca a nivel de módulo. */
export function ensureGsapPluginsRegistered(): void {
  if (registered) return;
  gsap.registerPlugin(ScrollTrigger);
  registered = true;
}

export { ScrollTrigger };
