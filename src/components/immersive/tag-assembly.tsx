"use client";

import { useMemo } from "react";
import * as THREE from "three";

import {
  buildTagShape,
  buildTagFaceGeometry,
  buildTagEdgeGeometry,
  buildThreadCurve,
} from "@/components/immersive/tag-geometry";
import { useTagTextures } from "@/components/immersive/use-canvas-textures";

/**
 * Ensamble 3D de "La etiqueta" (docs/spec/05-direccion-arte.md §6):
 * gancho (toro parcial + cilindro), hilo (tubo sobre curva), etiqueta
 * (plano con agujero real, frente/dorso/canto).
 *
 * Jerarquía: `pendulumGroupRef` (gancho + hilo, lo que se balancea) >
 * `tagGroupRef` (la etiqueta en sí, lo que gira en Y para el dorso) —
 * swing independiente del giro, tal como describe el §6.
 */

export interface TagAssemblyProps {
  pendulumGroupRef: React.RefObject<THREE.Group>;
  tagGroupRef: React.RefObject<THREE.Group>;
}

const TAG_WIDTH = 1;
const TAG_HEIGHT = 1.8;
const TAG_DEPTH = 0.05;

// Punta del gancho (donde nace el hilo). El hilo se ata en el ojal de la
// etiqueta — MISMO cálculo que `holeCenterY` en tag-geometry.ts
// (`buildTagShape`), así el hilo entra literalmente por el agujero real.
const HOOK_END = new THREE.Vector3(0, 1.15, 0);
const TAG_THREAD_ATTACH = new THREE.Vector3(
  0,
  TAG_HEIGHT / 2 - TAG_HEIGHT * 0.1,
  0,
);

// Colores de la escala ink/paper/line/mute — tailwind.config.ts §3.1.
const COLOR_MUTE = "#A3A3A3";
const COLOR_INK_3 = "#595959";
const COLOR_LINE_2 = "#EDEDED";

export function TagAssembly({
  pendulumGroupRef,
  tagGroupRef,
}: TagAssemblyProps): React.JSX.Element {
  const textures = useTagTextures();

  const tagShape = useMemo(() => buildTagShape(TAG_WIDTH, TAG_HEIGHT), []);
  const faceGeometry = useMemo(
    () => buildTagFaceGeometry(tagShape),
    [tagShape],
  );
  const edgeGeometry = useMemo(
    () => buildTagEdgeGeometry(tagShape, TAG_DEPTH),
    [tagShape],
  );
  const threadCurve = useMemo(
    () => buildThreadCurve(HOOK_END, TAG_THREAD_ATTACH),
    [],
  );
  const threadGeometry = useMemo(
    () => new THREE.TubeGeometry(threadCurve, 24, 0.008, 6, false),
    [threadCurve],
  );

  // Multi-material del canto: [caps, sides] — ExtrudeGeometry asigna
  // materialIndex 0 a las tapas (caps) y 1 al contorno (sides). Instancias
  // planas (sin hijos JSX) para poder pasarlas como array a `material`.
  const edgeMaterials = useMemo(
    () => [
      new THREE.MeshStandardMaterial({ colorWrite: false, depthWrite: false }),
      new THREE.MeshStandardMaterial({
        color: COLOR_INK_3,
        metalness: 0,
        roughness: 0.7,
      }),
    ],
    [],
  );

  return (
    <group ref={pendulumGroupRef}>
      {/* Gancho de la percha: toro parcial (curvo) + cilindro (cuello recto). */}
      <mesh position={[0, 1.42, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.14, 0.018, 12, 24, Math.PI * 1.5]} />
        <meshStandardMaterial
          color={COLOR_MUTE}
          metalness={1}
          roughness={0.35}
        />
      </mesh>
      <mesh position={[0, 1.28, 0]}>
        <cylinderGeometry args={[0.018, 0.018, 0.24, 10]} />
        <meshStandardMaterial
          color={COLOR_MUTE}
          metalness={1}
          roughness={0.35}
        />
      </mesh>

      {/* Hilo de algodón entre el gancho y la etiqueta. */}
      <mesh geometry={threadGeometry}>
        <meshStandardMaterial
          color={COLOR_LINE_2}
          metalness={0}
          roughness={0.9}
        />
      </mesh>

      {/* La etiqueta en sí queda CENTRADA en el origen del mundo (no en
          TAG_THREAD_ATTACH): así el dolly/cámara por defecto la enmarca
          directamente. El hilo (arriba) es el que viaja hasta el punto de
          amarre en el ojal — la etiqueta no se desplaza para "alcanzarlo". */}
      <group ref={tagGroupRef}>
        {/* Frente: wordmark horneado desde el SVG. */}
        <mesh geometry={faceGeometry}>
          <meshStandardMaterial
            map={textures?.front ?? null}
            normalMap={textures?.normal ?? null}
            roughnessMap={textures?.roughness ?? null}
            color={textures ? "#FFFFFF" : "#FAFAFA"}
            roughness={0.8}
            side={THREE.FrontSide}
          />
        </mesh>

        {/* Dorso: layout tipográfico, dibujado pre-espejado en X para que
            quede legible tras el flip de rotation.y = Math.PI. */}
        <mesh geometry={faceGeometry} rotation={[0, Math.PI, 0]}>
          <meshStandardMaterial
            map={textures?.back ?? null}
            normalMap={textures?.normal ?? null}
            roughnessMap={textures?.roughness ?? null}
            color={textures ? "#FFFFFF" : "#FAFAFA"}
            roughness={0.8}
            side={THREE.FrontSide}
          />
        </mesh>

        {/* Canto: grupo "sides" (canto real, tintado) + grupo "caps"
            (frente/dorso combinados por ExtrudeGeometry — ocultos porque
            las dos ShapeGeometry de arriba ya tapan esa zona exactamente).
            NO se reasignan índices de grupo a mano: el orden [caps, sides]
            es el que produce ExtrudeGeometry (materialIndex 0 = caps,
            materialIndex 1 = sides). */}
        <mesh geometry={edgeGeometry} material={edgeMaterials} />
      </group>
    </group>
  );
}
