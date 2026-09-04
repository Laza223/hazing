# ADR 0003 — Motion y 3D: GSAP + Lenis + React Three Fiber, cargados por ruta

Fecha: 2026-09-03 · Estado: **propuesta** (se acepta junto con [`docs/spec/05-direccion-arte.md`](../spec/05-direccion-arte.md))

## Problema

La Fase 5 redefinida pide coreografía ligada al scroll (secciones pineadas, scrub, transiciones por máscara, FLIP entre secciones), un único momento WebGL protagonista y sensación de scroll con peso — sobre Next.js 15 App Router + React 19, desplegado en Cloudflare Workers (worker ≤ 3 MB gz en plan Free) y con targets duros de performance (LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1). Hay que elegir con qué se anima, cómo se carga y qué queda fuera del worker.

## Precedente propio

`glamify-makeup` no tiene librería de animación (solo transiciones CSS y `tailwindcss-animate`). No hay patrón propio del que divergir; el brief pide explícitamente GSAP + ScrollTrigger y Three/R3F solo para el 3D. La investigación del 2026-09-03 confirmó GSAP + ScrollTrigger + `gsap.matchMedia()` en producción en khaite.com y WebGL solo en momentos puntuales en Weekend Max Mara (MONOGRID), Max Mara Jacket Circle y MIU MIU (ver spec §1.1).

## Alternativas descartadas

1. **Framer Motion / `motion`** — excelente para transiciones de componentes, pero el pin con `end` exacto, el scroll horizontal pineado y el FLIP entre posiciones del DOM en secciones distintas son artesanales; el brief pide ScrollTrigger y es el estándar del segmento.
2. **CSS scroll-driven animations (`animation-timeline`)** — cero JS y perfecto para parallax simple, pero sin pin con fin exacto, sin FLIP, sin acople con la escena 3D, y sin soporte en Safari anterior a 26 (iOS 16–18 sigue siendo relevante en Argentina). Queda como mejora progresiva futura solo para parallax.
3. **GSAP ScrollSmoother en vez de Lenis** — mete el contenido en un wrapper transformado y rompe `position: sticky` (información sticky de PDP, barra sticky de compra) y la semántica de scroll nativo. Lenis mantiene el scroll nativo y el sticky.
4. **three.js "vanilla" en vez de React Three Fiber** — menos KB, pero ciclo de vida de escena a mano dentro de React. R3F + drei dan escena declarativa, integración con el ciclo de vida de React y helpers ya resueltos (`ContactShadows`, `Lightformer`, `useTexture`). El costo extra vive en un chunk lazy.
5. **3D hosteado (Spline, Unicorn Studio)** — rápido de armar, pero runtime desde dominio de terceros, lock-in, menos control de performance y fallback, y costo mensual.
6. **PixiJS (2D acelerado, como Max Mara Jacket Circle)** — más liviano, pero "La etiqueta" necesita luz, material y rotación reales: es 3D.

## Decisión

- **Coreografía:** `gsap` 3.15 (core + `ScrollTrigger` + `Flip`; 100 % gratis desde la adquisición por Webflow, plugins incluidos) para todo lo secuenciado o ligado al scroll. **CSS** para hover/focus/estado. Un solo motion system con tokens compartidos (spec §8).
- **Scroll suave:** `lenis` 1.3 solo en desktop con puntero fino (`lerp` 0.09); nunca en táctil; destruido con `prefers-reduced-motion`.
- **3D:** `three` 0.185 + `@react-three/fiber` 9.7 + `@react-three/drei` 10.7, en un chunk propio cargado bajo demanda (IntersectionObserver a 2 viewports en la home; botón "Ver en 3D" en PDP). Nunca en el bundle inicial de ninguna ruta.
- **Fronteras de carga:** todo módulo que importe `three`, `@react-three/*` o `lenis` se monta detrás de `next/dynamic(..., { ssr: false })` dentro de un client component. GSAP se importa solo desde `src/lib/motion/*` y componentes `"use client"`; el registro de plugins ocurre en un `useEffect` del `MotionProvider`, no a nivel de módulo.
- **Reduced motion** es de primera clase: `gsap.matchMedia()` apaga scrub, pins y Lenis, deja solo opacidad, y el 3D se reemplaza por un still.
- **Tipografía display:** Archivo como variable con eje de ancho — `next/font/google` exige `weight: "variable"` cuando se declara `axes: ["wdth"]` (la combinación con pesos fijos falla en build).

## Reglas verificables (entran al cierre de cada sub-fase)

- `grep -c "WebGLRenderer" .open-next/worker.js` = 0 y `grep -c "lenis" .open-next/worker.js` = 0.
- JS inicial de cualquier ruta del storefront ≤ 220 KB gz; chunk 3D ≤ 450 KB gz.
- Ninguna importación de `three`/`@react-three/*`/`lenis` fuera de `src/components/immersive/*` y `src/lib/motion/*`.

## Evidencia del spike (2026-09-03, worktree aislado, Sonnet)

Versiones resueltas: `gsap@3.15.0`, `three@0.185.1`, `@react-three/fiber@9.7.0`, `@react-three/drei@10.7.8`, `lenis@1.3.26`, `@types/three@0.185.4`. Sin warnings de peer deps.

| Medición (`pnpm build`) | Baseline | Con las 5 libs + página `/spike` |
| --- | --- | --- |
| `/` First Load JS | 102 kB | 103 kB (el delta es Archivo variable, no las libs) |
| `/spike` (R3F + GSAP + Lenis) | — | 51.3 kB propio · 154 kB First Load |
| `WebGLRenderer` en `.next/server/**` | — | 0 (3 en `.next/static/chunks/*`) |
| `pnpm typecheck` / `pnpm test` | verde | verde (116 tests) |

Caveat medido: un client component con `import gsap` renderizado por SSR deja el código de GSAP en el chunk de servidor de esa página (134 KB sin comprimir). No ejecuta nada, pero pesa: de ahí la regla de registrar plugins en `useEffect` y de mantener GSAP fuera de módulos compartidos por el servidor.

**Bloqueo de entorno:** `pnpm build:worker` falla en esta máquina Windows con `EPERM: operation not permitted, symlink` durante "Collecting build traces" (`next build` en modo standalone forzado por OpenNext) — **también en baseline, sin ninguna lib nueva**. `.open-next/worker.js` nunca se generó, así que el tamaño del worker no se pudo medir localmente. Causa: sin privilegio de symlink (no admin, sin Modo de desarrollador). El gate del worker se mide en CI (Linux) desde la sub-fase 5.1; habilitar el Modo de desarrollador de Windows es decisión de Lazar (cambia una configuración del sistema).

## Reversibilidad

Barata para GSAP y Lenis (client-only, encapsulados en `src/lib/motion/*`); moderada para R3F (un único componente lazy que se puede reemplazar por un still o un video sin tocar el resto). No requiere revisor de arquitectura adicional: el spike es la evidencia proporcional.

## Consecuencias aceptadas

- +≈ 50 KB gz de JS en todas las rutas del storefront (GSAP core + ScrollTrigger + Flip + Lenis).
- Dos paradigmas de animación (CSS para micro, GSAP para coreografía) con regla de reparto escrita; nadie mezcla.
- ≈ 400 KB gz de three/R3F/drei solo en la home, solo cuando el usuario se acerca a la sección.
- La animación no se cubre con tests unitarios: se verifica con el verificador de UX en navegador real, `@axe-core/playwright` y Lighthouse en `preview:worker` (o CI mientras el build del worker no corra local).
