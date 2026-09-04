"use client";

import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";

import {
  WORDMARK_PATH_D,
  WORDMARK_VIEWBOX,
} from "@/components/brand/wordmark-path";
import { SIGNATURE_MOMENT_TAG_BACK } from "@/lib/content/copy";

/**
 * Texturas horneadas al vuelo de la etiqueta "La etiqueta"
 * (docs/spec/05-direccion-arte.md §6: "el wordmark se rasteriza al vuelo
 * desde el SVG a una textura de 2048 px", "el papel un material rugoso con
 * normal map procedural").
 *
 * Hook `"use client"`. Memoiza con `useMemo`, dispone (`texture.dispose()`)
 * en cleanup.
 */
export interface TagTextures {
  front: THREE.CanvasTexture;
  back: THREE.CanvasTexture;
  normal: THREE.CanvasTexture;
  roughness: THREE.CanvasTexture;
}

/**
 * Resolución de la cara de la etiqueta. El §6 pide 2048 px, pero generar dos
 * caras de 2048² con Canvas2D es una tarea larga medible: en la medición de
 * la sub-fase 5.4 (mobile con CPU 4x) el montaje de la escena aparecía como
 * una tarea de ~600 ms, muy por encima del target de 200 ms del §10. En
 * pantallas chicas la etiqueta nunca ocupa más de ~400 px de ancho real, así
 * que 1024 px es indistinguible ahí y cuesta la cuarta parte.
 */
function faceSize(): number {
  if (typeof window === undefined) return 2048;
  return window.matchMedia("(min-width: 1024px) and (pointer: fine)").matches
    ? 2048
    : 1024;
}
const NOISE_SIZE = 256;

// Tokens de la escala ink/paper/line de tailwind.config.ts — ver
// docs/spec/05-direccion-arte.md §3.1. Nunca un color fuera de esta escala.
const COLOR_PAPER_2 = "#FAFAFA";
const COLOR_LINE_2 = "#EDEDED";
const COLOR_INK = "#171717";

function drawWordmarkFront(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const size = canvas.width;

  ctx.fillStyle = COLOR_PAPER_2;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = COLOR_LINE_2;
  for (let i = 0; i < 40; i++) {
    ctx.fillRect(
      Math.random() * size,
      Math.random() * size,
      Math.random() * 2,
      Math.random() * 2,
    );
  }

  // viewBox "0 0 1821 549" — se centra y escala al ancho del canvas con margen.
  const [, , vbWidth, vbHeight] = WORDMARK_VIEWBOX.split(" ").map(Number);
  const margin = size * 0.12;
  const availableWidth = size - margin * 2;
  const scale = availableWidth / vbWidth;
  const offsetX = margin;
  const offsetY = (size - vbHeight * scale) / 2;

  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);
  ctx.fillStyle = COLOR_INK;
  const path2d = new Path2D(WORDMARK_PATH_D);
  // "evenodd" es OBLIGATORIO: el path original declara fillRule="evenodd" —
  // sin esto las letras con contraojo (A, O) rellenan sólido.
  ctx.fill(path2d, "evenodd");
  ctx.restore();
}

function drawBack(canvas: HTMLCanvasElement, fontFamily: string): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const size = canvas.width;

  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = COLOR_PAPER_2;
  ctx.fillRect(0, 0, size, size);

  // Pre-espejado en X: el mesh del dorso se renderiza con rotation.y = Math.PI,
  // así que el texto pintado espejado queda legible tras el flip.
  ctx.save();
  ctx.translate(size, 0);
  ctx.scale(-1, 1);

  ctx.fillStyle = COLOR_INK;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const lines = [
    "HAZING",
    SIGNATURE_MOMENT_TAG_BACK.origin,
    SIGNATURE_MOMENT_TAG_BACK.sizeColorLabel,
    SIGNATURE_MOMENT_TAG_BACK.exampleOrderNumber,
  ];
  const fontSize = size * 0.07;
  const lineHeight = fontSize * 1.6;
  const startY = size / 2 - (lineHeight * (lines.length - 1)) / 2;

  lines.forEach((line, i) => {
    ctx.font = `${i === 0 ? 600 : 400} ${fontSize}px ${fontFamily}`;
    ctx.fillText(line, size / 2, startY + i * lineHeight);
  });

  ctx.restore();
}

function drawNoise(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const size = canvas.width;

  ctx.fillStyle = "#7f7f7f";
  ctx.fillRect(0, 0, size, size);

  // Trazos cortos con dirección de fibra dominante — base para derivar el
  // normal map por diferencias finitas de este canal de altura.
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 1;
  const strokeCount = 900;
  for (let i = 0; i < strokeCount; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const len = 3 + Math.random() * 5;
    const angle = Math.PI / 2 + (Math.random() - 0.5) * 0.5; // fibra ~vertical
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
    ctx.stroke();
  }
  ctx.filter = "blur(1px)";
  ctx.drawImage(canvas, 0, 0);
  ctx.filter = "none";
}

/** Deriva un normal map por diferencias finitas de un canvas de altura (escala de grises). */
function heightToNormalMap(heightCanvas: HTMLCanvasElement): HTMLCanvasElement {
  const size = heightCanvas.width;
  const heightCtx = heightCanvas.getContext("2d");
  const normalCanvas = document.createElement("canvas");
  normalCanvas.width = size;
  normalCanvas.height = size;
  const normalCtx = normalCanvas.getContext("2d");
  if (!heightCtx || !normalCtx) return normalCanvas;

  const heightData = heightCtx.getImageData(0, 0, size, size).data;
  const out = normalCtx.createImageData(size, size);
  const strength = 2.2;

  const heightAt = (x: number, y: number) => {
    const cx = Math.min(size - 1, Math.max(0, x));
    const cy = Math.min(size - 1, Math.max(0, y));
    return heightData[(cy * size + cx) * 4]! / 255;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const left = heightAt(x - 1, y);
      const right = heightAt(x + 1, y);
      const up = heightAt(x, y - 1);
      const down = heightAt(x, y + 1);

      const dx = (left - right) * strength;
      const dy = (up - down) * strength;
      const dz = 1;
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz);

      const idx = (y * size + x) * 4;
      out.data[idx] = ((dx / len) * 0.5 + 0.5) * 255;
      out.data[idx + 1] = ((dy / len) * 0.5 + 0.5) * 255;
      out.data[idx + 2] = ((dz / len) * 0.5 + 0.5) * 255;
      out.data[idx + 3] = 255;
    }
  }

  normalCtx.putImageData(out, 0, 0);
  return normalCanvas;
}

function createCanvas(size: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  return canvas;
}

/**
 * Familia real de la tipografía display — NO se hardcodea `"Archivo"`. Se
 * lee de un nodo DOM real con la clase `font-display` (la misma que lleva
 * el caption del dorso, §11/§14): `next/font` resuelve ahí el nombre real
 * incluyendo el fallback. El nodo es efímero, solo para leer el cómputo.
 */
function resolveDisplayFontFamily(): string {
  if (typeof document === "undefined") return "serif";
  const probe = document.createElement("span");
  probe.className = "font-display";
  probe.style.position = "absolute";
  probe.style.visibility = "hidden";
  probe.style.pointerEvents = "none";
  document.body.appendChild(probe);
  const family = getComputedStyle(probe).fontFamily;
  document.body.removeChild(probe);
  return family;
}

/**
 * `null` mientras `document.fonts` no está listo — evita hornear con la
 * fuente fallback.
 */
export function useTagTextures(): TagTextures | null {
  const [fontsReady, setFontsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (typeof document === "undefined" || !document.fonts) {
      setFontsReady(true);
      return;
    }
    document.fonts.ready
      .then(() => {
        if (!cancelled) setFontsReady(true);
      })
      .catch(() => {
        if (!cancelled) setFontsReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const textures = useMemo<TagTextures | null>(() => {
    if (!fontsReady || typeof document === "undefined") return null;

    const size = faceSize();
    const frontCanvas = createCanvas(size);
    drawWordmarkFront(frontCanvas);

    const fontFamily = resolveDisplayFontFamily();
    const backCanvas = createCanvas(size);
    drawBack(backCanvas, fontFamily);

    const heightCanvas = createCanvas(NOISE_SIZE);
    drawNoise(heightCanvas);
    const normalCanvas = heightToNormalMap(heightCanvas);

    const front = new THREE.CanvasTexture(frontCanvas);
    const back = new THREE.CanvasTexture(backCanvas);
    const normal = new THREE.CanvasTexture(normalCanvas);
    const roughness = new THREE.CanvasTexture(heightCanvas);

    front.colorSpace = THREE.SRGBColorSpace;
    back.colorSpace = THREE.SRGBColorSpace;
    front.needsUpdate = true;
    back.needsUpdate = true;
    normal.needsUpdate = true;
    roughness.needsUpdate = true;

    return { front, back, normal, roughness };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fontsReady]);

  useEffect(() => {
    return () => {
      textures?.front.dispose();
      textures?.back.dispose();
      textures?.normal.dispose();
      textures?.roughness.dispose();
    };
  }, [textures]);

  return textures;
}
