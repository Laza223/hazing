"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";

import { useReducedMotion } from "@/lib/motion/use-reduced-motion";

/**
 * Contrato compartido del beat 3 (docs/spec/05-direccion-arte.md §4:
 * "Hero → comercio") entre `Hero`/`HeroToCommerce` (src/components/home/hero.tsx,
 * hero-to-commerce.tsx, sub-fase 5.2) y el tile de destino del Flip en
 * `NewIn` (src/components/home/new-in.tsx). Ninguno de esos archivos conocía
 * la firma exacta del otro lado — este módulo la fija, escrito por el
 * integrador a partir de la API que ambos ya asumían (`useHomeSequenceNode`,
 * `useHomeSequenceState`, `HomeSequenceProvider`) para no forzar un rewrite
 * de ninguno de los dos.
 */
export type HomeSequenceNodeKey = "heroKeyImage" | "firstTileImage";

type NodeMap = Record<HomeSequenceNodeKey, HTMLDivElement | null>;

interface HomeSequenceContextValue {
  /**
   * Modo A (Flip) habilitado: el hero renderiza su marco de imagen clave
   * (`hasHeroKeyFrame`) Y el visitante no pidió `prefers-reduced-motion`.
   *
   * Es el MARCO lo que vuela, no la foto: el Flip anima top/left/width/height
   * y el contenido interno (la imagen real cuando exista A3, o el slot del
   * asset pendiente mientras tanto) usa `absolute inset-0 object-cover`, así
   * que se recorta solo al cambiar de proporción. Por eso el modo A funciona
   * y se verifica desde hoy, sin esperar a la producción de campaña — atarlo
   * a "hay foto" dejaba muerta la mecánica de mayor riesgo de la sub-fase
   * (hallazgo de la revisión adversarial de 5.2).
   */
  flightEnabled: boolean;
  register: (key: HomeSequenceNodeKey, el: HTMLDivElement | null) => void;
  nodes: RefObject<NodeMap>;
  /** Incrementa en cada `register` — permite a un consumidor re-renderizar cuando un nodo aparece/desaparece sin leer un ref en render. */
  version: number;
}

const HomeSequenceContext = createContext<HomeSequenceContextValue | null>(
  null,
);

export interface HomeSequenceProviderProps {
  /**
   * true si el hero renderiza el marco de imagen clave (con la foto A3 real
   * o con su slot pendiente). No depende de que la foto exista — ver
   * `flightEnabled`.
   */
  hasHeroKeyFrame: boolean;
  children: ReactNode;
}

export function HomeSequenceProvider({
  hasHeroKeyFrame,
  children,
}: HomeSequenceProviderProps) {
  const reducedMotion = useReducedMotion();
  const nodes = useRef<NodeMap>({ heroKeyImage: null, firstTileImage: null });
  const [version, setVersion] = useState(0);

  const register = useCallback(
    (key: HomeSequenceNodeKey, el: HTMLDivElement | null) => {
      nodes.current[key] = el;
      setVersion((v) => v + 1);
    },
    [],
  );

  const flightEnabled = hasHeroKeyFrame && !reducedMotion;

  const value = useMemo<HomeSequenceContextValue>(
    () => ({ flightEnabled, register, nodes, version }),
    [flightEnabled, register, version],
  );

  return (
    <HomeSequenceContext.Provider value={value}>
      {children}
    </HomeSequenceContext.Provider>
  );
}

function useHomeSequenceContext(): HomeSequenceContextValue {
  const ctx = useContext(HomeSequenceContext);
  if (!ctx) {
    throw new Error(
      "useHomeSequenceNode/useHomeSequenceState requiere un <HomeSequenceProvider> ancestro.",
    );
  }
  return ctx;
}

/** Devuelve un callback ref que registra el nodo bajo `key` — pasarlo como `ref` del contenedor real. */
export function useHomeSequenceNode(
  key: HomeSequenceNodeKey,
): (el: HTMLDivElement | null) => void {
  const { register } = useHomeSequenceContext();
  return useCallback(
    (el: HTMLDivElement | null) => register(key, el),
    [register, key],
  );
}

export function useHomeSequenceState(): HomeSequenceContextValue {
  return useHomeSequenceContext();
}
