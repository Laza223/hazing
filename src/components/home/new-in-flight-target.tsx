"use client";

import { NewIn, type NewInProps } from "@/components/home/new-in";
import { useHomeSequenceNode } from "@/components/home/home-sequence-context";

/**
 * Puente de integración (sub-fase 5.2) entre `NewIn` y `HeroToCommerce`.
 *
 * `NewIn` expone el primer tile por DOS mecanismos redundantes (prop
 * `heroTileRef` + atributo `data-new-in-hero-tile`, ver new-in.tsx) porque su
 * autor no pudo coordinar en vivo con `HeroToCommerce`, que lee el nodo desde
 * `nodes.current.firstTileImage` de `HomeSequenceProvider`
 * (home-sequence-context.tsx). Sin este puente, `heroTileRef` no se conecta
 * a nada: `flightEnabled` puede ser `true` pero el nodo queda `null` y el
 * beat 3 cae en silencio al Modo B (wipe, sin Flip) — exactamente el riesgo
 * que new-in.tsx señala en sus pendientes.
 *
 * Envoltorio "use client" aparte (en vez de llamar el hook directo en
 * page.tsx) para que `page.tsx` siga siendo Server Component.
 */
export function NewInFlightTarget(props: NewInProps) {
  const registerFirstTile = useHomeSequenceNode("firstTileImage");
  return <NewIn {...props} heroTileRef={registerFirstTile} />;
}
