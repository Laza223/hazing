"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

interface SceneErrorBoundaryProps {
  /** Qué se muestra si la escena 3D falla en runtime. */
  fallback: ReactNode;
  children: ReactNode;
}

interface SceneErrorBoundaryState {
  failed: boolean;
}

/**
 * Error boundary del momento inmersivo (docs/spec/05-direccion-arte.md §6:
 * "En ningún caso la sección desaparece ni bloquea nada").
 *
 * `probeWebgl()` solo comprueba que crear el contexto no tire — no cubre
 * fallos en tiempo de render de three/R3F (extensión no soportada, contexto
 * perdido, driver defectuoso). Sin este boundary, ese error se propaga y
 * tumba la home entera en vez de degradar al still. Hallazgo de la revisión
 * adversarial de 5.3 (lente de accesibilidad y fallbacks).
 *
 * Tiene que ser un componente de clase: los hooks no pueden capturar errores
 * de render de sus hijos.
 */
export class SceneErrorBoundary extends Component<
  SceneErrorBoundaryProps,
  SceneErrorBoundaryState
> {
  state: SceneErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): SceneErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Sin servicio de errores todavía (PostHog es Fase 6+): dejamos rastro en
    // consola para que un fallo de WebGL sea diagnosticable, sin romper la UI.
    console.error(
      "[momento inmersivo] la escena 3D falló, se sirve el still:",
      error,
      info.componentStack,
    );
  }

  render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
