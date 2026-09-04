import * as THREE from "three";

/**
 * Geometría procedural de la etiqueta "La etiqueta"
 * (docs/spec/05-direccion-arte.md §6: "la etiqueta es un plano con agujero,
 * el hilo un tubo sobre una curva, el gancho un toro + cilindro").
 *
 * Puro — sin JSX/hooks/Canvas. Solo importa `three` (matemática pura, corre
 * en Node sin GPU) para que `tests/unit/immersive/tag-geometry.test.ts`
 * pueda ejercitarlo sin mock de Canvas/WebGL.
 */

/**
 * Rect redondeado (radio ~4% del ancho) con un `THREE.Path` como hole
 * (círculo, radio ~8% del ancho, centro a ~10% del borde superior) — este
 * hole ES el ojal: geometría real, no una textura pintada, tal como pide el
 * §6 ("un plano con agujero").
 */
export function buildTagShape(width = 1, height = 1.8): THREE.Shape {
  const hw = width / 2;
  const hh = height / 2;
  const radius = width * 0.04;

  const shape = new THREE.Shape();
  shape.moveTo(-hw + radius, -hh);
  shape.lineTo(hw - radius, -hh);
  shape.absarc(hw - radius, -hh + radius, radius, -Math.PI / 2, 0, false);
  shape.lineTo(hw, hh - radius);
  shape.absarc(hw - radius, hh - radius, radius, 0, Math.PI / 2, false);
  shape.lineTo(-hw + radius, hh);
  shape.absarc(-hw + radius, hh - radius, radius, Math.PI / 2, Math.PI, false);
  shape.lineTo(-hw, -hh + radius);
  shape.absarc(
    -hw + radius,
    -hh + radius,
    radius,
    Math.PI,
    1.5 * Math.PI,
    false,
  );

  const holeRadius = width * 0.08;
  const holeCenterY = hh - height * 0.1;
  const hole = new THREE.Path();
  hole.absarc(0, holeCenterY, holeRadius, 0, Math.PI * 2, true);
  shape.holes.push(hole);

  return shape;
}

/** Cara plana (frente/dorso) de la etiqueta, con UVs para las texturas horneadas. */
export function buildTagFaceGeometry(shape: THREE.Shape): THREE.ShapeGeometry {
  return new THREE.ShapeGeometry(shape, 24);
}

/**
 * Canto (grosor) de la etiqueta. Grupo "sides" (canto real) + grupo "caps"
 * (frente/dorso combinados por `ExtrudeGeometry`, que en tag-assembly.tsx se
 * oculta con `colorWrite:false, depthWrite:false` porque las dos
 * `ShapeGeometry` de la cara ya tapan esa zona exactamente — NO se
 * reasignan índices de grupo a mano).
 */
export function buildTagEdgeGeometry(
  shape: THREE.Shape,
  depth: number,
): THREE.ExtrudeGeometry {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.01,
    bevelSize: 0.01,
    bevelSegments: 2,
    curveSegments: 24,
  });
  // Extrude arranca en z=0 y crece hacia +z — se centra para que las dos
  // caras (frente/dorso) queden en ±depth/2, simétricas respecto al origen.
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}

/** Curva de referencia del gancho de la percha (toro parcial estilizado). */
export function buildHookCurve(): THREE.CatmullRomCurve3 {
  const points = [
    new THREE.Vector3(0, 1.55, 0),
    new THREE.Vector3(0.16, 1.68, 0),
    new THREE.Vector3(0.16, 1.85, 0),
    new THREE.Vector3(0, 1.95, 0),
    new THREE.Vector3(-0.16, 1.85, 0),
  ];
  return new THREE.CatmullRomCurve3(points);
}

/** Curva del hilo de algodón entre la punta del gancho y el tope de la etiqueta. */
export function buildThreadCurve(
  hookEnd: THREE.Vector3,
  tagTop: THREE.Vector3,
): THREE.CatmullRomCurve3 {
  const mid = hookEnd.clone().lerp(tagTop, 0.5);
  return new THREE.CatmullRomCurve3([hookEnd.clone(), mid, tagTop.clone()]);
}
