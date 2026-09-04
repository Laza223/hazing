/**
 * Tabla de keyframes del momento inmersivo "La etiqueta"
 * (docs/spec/05-direccion-arte.md §6, tabla "Guion vinculado al scroll").
 *
 * Tipos + DATO tipado — sin gsap, sin three. Es la fuente de verdad
 * testeable del guion: los `p` y qué propiedad cambia en cada tramo vienen
 * literal de la spec (no negociables); los valores numéricos de
 * cámara/luz son referencia inicial, afinada visualmente en verificacion-ux.
 */

export interface SceneState {
  /** Distancia de dolly de la cámara. */
  camZ: number;
  /** Radianes, giro de la etiqueta en Y (0 → Math.PI). */
  tagRotY: number;
  /** Radianes, amplitud del balanceo (0 → ~0.026 rad ≈ 1.5°). */
  pendulumAmplitude: number;
  keyIntensity: number;
  /** position.x de la key light (barrido). */
  keyX: number;
  rimIntensity: number;
  /** position.x de la rim light (barrido izquierda→derecha). */
  rimX: number;
  /** 0→1, opacidad del overlay de salida (beat final). */
  fadeToPaper: number;
}

export const INITIAL_SCENE_STATE: SceneState = {
  camZ: 1.2,
  tagRotY: 0,
  pendulumAmplitude: 0,
  keyIntensity: 0.6,
  keyX: -1,
  rimIntensity: 0,
  rimX: -3,
  fadeToPaper: 0,
};

export interface SceneKeyframe {
  p: number;
  state: Partial<SceneState>;
}

/**
 * Breakpoints IDÉNTICOS a la tabla de docs/spec/05-direccion-arte.md §6.
 * Los valores numéricos de cámara/luz son referencia inicial — se afinan
 * visualmente en verificacion-ux; los `p` y QUÉ propiedad cambia en cada
 * tramo NO son negociables (vienen literal de la spec).
 */
export const SIGNATURE_MOMENT_KEYFRAMES: readonly SceneKeyframe[] = [
  {
    p: 0.0,
    state: {
      camZ: 1.2,
      tagRotY: 0,
      pendulumAmplitude: 0,
      keyIntensity: 0.6,
      keyX: -1,
      rimIntensity: 0,
      rimX: -3,
      fadeToPaper: 0,
    },
  },
  // fin del macro; a partir de acá empieza el dolly-out
  { p: 0.1, state: { camZ: 1.2 } },
  // péndulo ±1.5°, rim barre izq→der
  {
    p: 0.35,
    state: { camZ: 3.5, pendulumAmplitude: 0.026, rimIntensity: 1.2, rimX: 3 },
  },
  // cámara fija, giro 180°, key se endurece
  {
    p: 0.65,
    state: {
      camZ: 3.5,
      tagRotY: Math.PI,
      pendulumAmplitude: 0.005,
      keyIntensity: 1.4,
      keyX: 0,
      rimIntensity: 1.6,
    },
  },
  // dolly-out final, se asienta
  { p: 0.9, state: { camZ: 6, tagRotY: Math.PI, pendulumAmplitude: 0 } },
  // fundido a paper, despinea
  { p: 1.0, state: { fadeToPaper: 1 } },
] as const;
