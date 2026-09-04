/**
 * Gate de capacidad del momento inmersivo "La etiqueta"
 * (docs/spec/05-direccion-arte.md §6 "Mobile y fallbacks", §10, §11).
 *
 * Puro — sin JSX, sin imports de three/gsap/react. Se evalúa ANTES de
 * cualquier `import()` dinámico de la escena 3D: si `canRunSignatureMomentScene`
 * devuelve `false`, `signature-moment.tsx` nunca pide el chunk de three
 * (cero bytes descargados, no solo "no ejecutados").
 */

export interface NavigatorWithMemory extends Navigator {
  deviceMemory?: number;
}

/**
 * Sondea soporte de WebGL creando un canvas descartable. `canvasFactory` es
 * inyectable para testear la rama de error sin depender de un DOM real.
 */
export function probeWebgl(
  canvasFactory: () => HTMLCanvasElement = () =>
    document.createElement("canvas"),
): boolean {
  try {
    const c = canvasFactory();
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export interface CapabilityInput {
  prefersReducedMotion: boolean;
  /** `navigator.deviceMemory` — undefined en Safari/Firefox, NO bloquea. */
  deviceMemory: number | undefined;
  webglAvailable: boolean;
}

/**
 * Decide si el dispositivo puede correr la escena 3D real. `false` en
 * cualquiera de las tres condiciones del §6: reduced-motion, memoria baja
 * (cuando el navegador la reporta), o sin WebGL.
 */
export function canRunSignatureMomentScene(input: CapabilityInput): boolean {
  if (input.prefersReducedMotion) return false;
  if (input.deviceMemory !== undefined && input.deviceMemory < 4) return false;
  if (!input.webglAvailable) return false;
  return true;
}
