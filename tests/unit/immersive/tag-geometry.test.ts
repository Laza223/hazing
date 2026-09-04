import { describe, it, expect } from "vitest";
import * as THREE from "three";

import {
  buildTagShape,
  buildTagFaceGeometry,
  buildTagEdgeGeometry,
  buildHookCurve,
  buildThreadCurve,
} from "@/components/immersive/tag-geometry";

describe("buildTagShape", () => {
  it("tiene exactamente un hole (el ojal, geometría real)", () => {
    const shape = buildTagShape();
    expect(shape.holes.length).toBe(1);
  });

  it("el hole tiene vértices reales (no un path vacío)", () => {
    const shape = buildTagShape();
    const holePoints = shape.holes[0]!.getPoints();
    expect(holePoints.length).toBeGreaterThan(0);
  });
});

describe("buildTagFaceGeometry", () => {
  it("bounding box respeta la proporción width:height ≈ 1:1.8", () => {
    const shape = buildTagShape(1, 1.8);
    const geometry = buildTagFaceGeometry(shape);
    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;
    const width = box.max.x - box.min.x;
    const height = box.max.y - box.min.y;
    expect(width).toBeGreaterThan(0);
    expect(height / width).toBeCloseTo(1.8, 1);
  });
});

describe("buildTagEdgeGeometry", () => {
  it("produce una geometría extruida con volumen (grupos sides + caps)", () => {
    const shape = buildTagShape();
    const geometry = buildTagEdgeGeometry(shape, 0.05);
    expect(geometry.groups.length).toBeGreaterThan(0);
    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;
    expect(box.max.z - box.min.z).toBeGreaterThan(0);
  });
});

describe("buildHookCurve / buildThreadCurve", () => {
  it("buildHookCurve devuelve una curva con getPoints(n).length === n+1", () => {
    const curve = buildHookCurve();
    const n = 10;
    expect(curve.getPoints(n).length).toBe(n + 1);
  });

  it("buildThreadCurve devuelve una curva con getPoints(n).length === n+1", () => {
    const hookEnd = new THREE.Vector3(0, 2, 0);
    const tagTop = new THREE.Vector3(0, 0.9, 0);
    const curve = buildThreadCurve(hookEnd, tagTop);
    const n = 8;
    expect(curve.getPoints(n).length).toBe(n + 1);
  });

  it("buildThreadCurve no muta los vectores de entrada", () => {
    const hookEnd = new THREE.Vector3(0, 2, 0);
    const tagTop = new THREE.Vector3(0, 0.9, 0);
    const hookEndCopy = hookEnd.clone();
    const tagTopCopy = tagTop.clone();
    buildThreadCurve(hookEnd, tagTop);
    expect(hookEnd).toEqual(hookEndCopy);
    expect(tagTop).toEqual(tagTopCopy);
  });
});
