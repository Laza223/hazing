"use client";

import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer } from "@react-three/drei";

import { TagAssembly } from "@/components/immersive/tag-assembly";
import type { SceneState } from "@/lib/motion/scene-state";

/**
 * Contenido que vive dentro de `<Canvas>` — lee `sceneState` (escrito por
 * GSAP en `signature-moment-scene.tsx`) cada frame y lo aplica a
 * cámara/luces/etiqueta. Un solo lector-escritor por reloj: GSAP escribe
 * `sceneState`, este componente solo lo lee; el parallax de mouse escribe
 * `camera.rotation` directo, nunca pasa por `sceneState`
 * (docs/spec/05-direccion-arte.md §6).
 */
export interface SceneContentsProps {
  sceneState: React.RefObject<SceneState>;
  isDesktop: boolean;
}

const MOUSE_PARALLAX_MAX_RAD = THREE.MathUtils.degToRad(2);

export function SceneContents({
  sceneState,
  isDesktop,
}: SceneContentsProps): React.JSX.Element {
  const pendulumGroupRef = useRef<THREE.Group>(null!);
  const tagGroupRef = useRef<THREE.Group>(null!);
  const keyLightRef = useRef<THREE.DirectionalLight>(null!);
  const rimLightRef = useRef<THREE.DirectionalLight>(null!);
  const baseCameraRotation = useRef<{ x: number; y: number } | null>(null);

  useFrame((state) => {
    const s = sceneState.current;
    if (!s) return;

    state.camera.position.z = s.camZ;

    if (tagGroupRef.current) {
      tagGroupRef.current.rotation.y = s.tagRotY;
    }

    if (pendulumGroupRef.current) {
      // Balanceo: oscilación continua calculada EN useFrame (no un tween
      // GSAP de valor único) — la amplitud sí la controla el scroll.
      pendulumGroupRef.current.rotation.z =
        s.pendulumAmplitude * Math.sin(state.clock.elapsedTime * 1.1);
    }

    if (keyLightRef.current) {
      keyLightRef.current.intensity = s.keyIntensity;
      keyLightRef.current.position.x = s.keyX;
    }

    if (rimLightRef.current) {
      rimLightRef.current.intensity = s.rimIntensity;
      rimLightRef.current.position.x = s.rimX;
    }

    // Parallax de mouse ≤2°, SOLO desktop — aditivo sobre camera.rotation,
    // nunca escribe sceneState (dos relojes, un solo lector-escritor cada uno).
    if (isDesktop) {
      if (!baseCameraRotation.current) {
        baseCameraRotation.current = {
          x: state.camera.rotation.x,
          y: state.camera.rotation.y,
        };
      }
      const base = baseCameraRotation.current;
      const offsetX = THREE.MathUtils.clamp(
        -state.pointer.y * MOUSE_PARALLAX_MAX_RAD,
        -MOUSE_PARALLAX_MAX_RAD,
        MOUSE_PARALLAX_MAX_RAD,
      );
      const offsetY = THREE.MathUtils.clamp(
        state.pointer.x * MOUSE_PARALLAX_MAX_RAD,
        -MOUSE_PARALLAX_MAX_RAD,
        MOUSE_PARALLAX_MAX_RAD,
      );
      state.camera.rotation.x = base.x + offsetX;
      state.camera.rotation.y = base.y + offsetY;
    }
  });

  return (
    <>
      <TagAssembly
        pendulumGroupRef={pendulumGroupRef}
        tagGroupRef={tagGroupRef}
      />
      <directionalLight
        ref={keyLightRef}
        position={[-1, 1, 2]}
        intensity={0.6}
      />
      <directionalLight
        ref={rimLightRef}
        position={[-3, 0.5, -1]}
        intensity={0}
      />
      {/* Bake único al montar (frames=1) — sin HDR externo. */}
      <Environment resolution={64} frames={1}>
        <Lightformer
          intensity={2}
          color="#ffffff"
          position={[0, 3, -2]}
          scale={[4, 4, 1]}
        />
      </Environment>
      {isDesktop && (
        <ContactShadows
          frames={1}
          opacity={0.4}
          blur={2}
          far={2}
          position={[0, -1.2, 0]}
        />
      )}
    </>
  );
}
