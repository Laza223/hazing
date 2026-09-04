"use client";

import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

/**
 * `prefers-reduced-motion` es de primera clase (docs/spec/05-direccion-arte.md
 * §8, §11), no una excepción: todo componente con scrub/pin/3D lo consulta y
 * cae a opacity-only o a un still. SSR-safe: devuelve `false` en el server y
 * se corrige en el primer efecto del cliente (evita flash de contenido animado
 * antes de la hidratación en el caso común, sin bloquear el render).
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    setReduced(mql.matches);

    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return reduced;
}
