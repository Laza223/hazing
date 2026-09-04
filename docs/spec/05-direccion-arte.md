# 05 — Dirección de arte y experiencia (Fase 5)

Fuente: brief de Lazar del 2026-09-03 ("Fase 5 — Digital flagship / Art direction"), que **redefine el objetivo de la fase**. Este documento reemplaza al §8 del handoff como fuente de verdad visual donde lo contradice; donde no lo contradice, el §8 sigue valiendo (escala de grises, radios, ratios, estados sin color, anti-patrones). Las decisiones de stack están en [ADR 0003](../decisions/0003-motion-y-3d.md).

Estado: **propuesta en lectura** — Lazar tomó las decisiones 1–4 de §14 el 2026-09-03 (momento 3D "La etiqueta", sin assets de campaña todavía → 5.2 contra slots, se mantiene "Carrito"/`/carrito`) y pidió leer el documento completo antes de arrancar 5.1. No se implementa nada hasta esa lectura.

## 1. Brief, en una línea

HAZING tiene que sentirse como el digital flagship de una marca de moda con dirección de arte de alto nivel (vara: KHAITE, TOTEME, Jacquemus, Acne Studios, Coperni, Balenciaga, MONOGRID para Weekend Max Mara), no como un theme premium. Principio: **80 % contención, 20 % espectáculo**. Criterio de éxito: "¿alguien creería que esto lo produjo un estudio digital de alto nivel para una marca internacional?".

### 1.1 Qué se pudo verificar de las referencias (2026-09-03)

Investigación de solo lectura (HTML servido + fichas de Awwwards; reporte completo con URLs en [`docs/research/2026-09-03-referencias-fashion.md`](../research/2026-09-03-referencias-fashion.md)); Jacquemus y Balenciaga bloquean el acceso automatizado y Acne queda detrás de un selector de país, así que de esos tres solo hay fuentes de terceros.

- **GSAP + ScrollTrigger + `gsap.matchMedia()`** está en producción en khaite.com (confirmado en el bundle servido). Awwwards lista GSAP en Weekend Max Mara (MONOGRID), Max Mara Jacket Circle (Adoratorio) y Jacquemus (histórico). Es el motor estándar del segmento.
- **WebGL/Three.js/PixiJS aparece en momentos puntuales, no en todo el sitio transaccional**: Weekend Max Mara (WebGL, SOTD ene-2026), Max Mara Jacket Circle (PixiJS, SOTD abr-2026), MIU MIU "A house that we shaped" (Three.js, SOTD ago-2026, animaciones 8.20/10). Coincide con la regla del brief: un momento protagonista, no un sitio 3D.
- **Accesibilidad es sistemáticamente el sub-score más bajo** de esos sitios en Awwwards (MIU MIU 6.80, Brunello Cucinelli 6.60, Jacquemus 6.00). Hazing no negocia eso: `04-calidad.md` sigue mandando (axe en verde, reduced motion de primera clase). Es la ventaja competitiva de hacerlo bien.
- **Tiles con swatches de color como puntos**, no thumbnails (coperni.com, en vivo). Micro-transiciones de botón a 300 ms (khaite.com, en vivo) — dentro del rango 150–250/300 del §8.5.
- **Mecánicas robables de MIU MIU** (nombres de Awwwards): "Viewmaster interaction" (rotar un objeto para revelar contenido) y "Matelassé interaction" (la textura del material como interacción dedicada). Las dos están absorbidas en el guion de §6.

## 2. Revisión crítica de lo existente

Inventario real del storefront hoy (commit `4d034ce`): tres archivos de UI y nada más.

| Pieza | Estado | Veredicto |
|---|---|---|
| `src/app/globals.css` | Variables HSL default de shadcn (`--background`, `--primary`…), radio 0.25rem global | **Reemplazar.** Es el template de shadcn con la paleta `neutral`; el radio global de 4px aplicaría también a imágenes. |
| `tailwind.config.ts` | Config generada por shadcn: `container` 1440, keyframes de acordeón, plugin `tailwindcss-animate` | **Reemplazar.** Sin escala tipográfica, sin tokens de motion, sin grilla. `tailwindcss-animate` se saca: sus utilidades (`animate-in`, `zoom-in`, `slide-in-from-*`) son el vocabulario de motion de SaaS que el brief prohíbe. |
| `src/app/layout.tsx` | Inter + Archivo 700/900 vía `next/font/google`, `lang="es-AR"` | **Conservar y ampliar.** Las familias son correctas para el brief (grotesca precisa + display con carácter). Archivo pasa a variable con eje de ancho (`wdth` 62–125) para el registro "future fashion" sin sumar una tercera fuente. |
| `src/app/(storefront)/page.tsx` | `<h1>` centrado | Placeholder. Se reemplaza entero. |
| `components.json` + Radix (`dialog`, `select`, `radio-group`, `switch`, `label`, `separator`, `slot`) | Instalados, sin componentes generados | **Conservar Radix como primitivas de accesibilidad** (foco, teclado, `aria`). No se genera la librería visual de shadcn para el storefront: el look sale de tokens propios. Para el admin (Fase 7) shadcn default está bien — es una herramienta interna. |
| `public/` | Vacío | Sin marca, sin favicon, sin OG. |
| Intento anterior (`../ecommerce-hazing/public`) | `logo.jpeg` 26 KB, `brush-stroke.svg` genérico, `favicon.svg` rosa | Solo sirve el JPEG como fuente para vectorizar el wordmark. Lo demás no se reutiliza. |

Conclusión: no hay diseño que conservar; hay fundaciones correctas (fuentes, Radix, `cn()`, TypeScript strict, Workers) sobre las que construir un sistema propio.

## 3. Concepto: RAW EDITORIAL × FUTURE FASHION

**El logo es el único gesto humano de la interfaz. Todo lo demás es precisión.**

- **El wordmark** (brush, imperfecto, gestual) aparece en pocos lugares y siempre grande o siempre chico, nunca mediano: la entrada de marca (grande, revelado por máscara), el header (chico, ≤ 28 px de alto), el pie de página (enorme, 40–60 vw) y la etiqueta del momento 3D (como textura de papel). Nunca se deforma, nunca lleva efectos, nunca se combina con otra caligrafía. Color: `ink` sobre `paper`, `paper` sobre `ink`. Se sirve como SVG vectorial (ver §12, asset A1).
- **La UI** usa Inter (texto, nav, labels, precios) y Archivo variable (display, numeración del menú, statements), sobre una grilla de 12 columnas, con reglas duras de radio 0 en imágenes, tracking amplio en mayúsculas, ratios fijos y estados sin color.
- **La tensión** se construye por contraste, no por mezcla: una tipografía cruda contra una tipografía de ingeniería; fotografía de campaña con aire contra grillas de producto exactas; un único momento inmersivo contra un sitio quieto.
- **Una sola inversión por página.** El momento 3D (§6) vive sobre fondo `ink` con tipografía `paper`. Es la única sección oscura del sitio y por eso funciona como espectáculo. No es dark mode (veto vigente).
- **Lo que NO es:** quiet luxury beige con serif; template maquillado; gradientes, glass, glow, marquees, cards con sombra, cursores custom, tilt.

### 3.1 Tokens

Color (idéntico al §8.3 del handoff, con nombres definitivos):

| Token | Hex | Uso |
|---|---|---|
| `paper` | `#FFFFFF` | fondo base |
| `paper-2` | `#FAFAFA` | fondo alterno de sección |
| `line-2` | `#EDEDED` | fondos sutiles, skeletons |
| `line` | `#D4D4D4` | bordes, divisores, reglas |
| `mute` | `#A3A3A3` | solo decorativo / disabled, nunca texto |
| `ink-4` | `#737373` | placeholder, terciario — solo ≥ 18 px o bold |
| `ink-3` | `#595959` | secundario, precios tachados |
| `ink-2` | `#404040` | subtítulos, labels |
| `ink` | `#171717` | texto principal, botones sólidos, fondo de la sección invertida |

Nunca `#000` (ni en el logo: el SVG usa `currentColor`). Ningún color fuera de esta tabla en el storefront. Los nombres de shadcn (`--background`, `--foreground`, `--border`…) se mapean a esta misma escala para que Radix/shadcn (admin) y storefront compartan paleta.

Tipografía:

| Rol | Familia | Tamaño | Peso / ancho | Tracking | Line-height |
|---|---|---|---|---|---|
| Display XL (menú, statements) | Archivo | `clamp(40px, 9vw, 128px)` | 800–900 · wdth 100–112 | 0.02em (mayúsculas) | 0.92 |
| H1 | Archivo | 32–40 mobile · 56–72 desktop | 700 · wdth 100 | 0.02em | 1.0 |
| H2 / nombre de sección | Inter | 12–13 px | 500 | 0.12em, mayúsculas | 1.2 |
| Body | Inter | 16 px (mínimo del proyecto) | 400 | 0 | 1.5 |
| Precio | Inter | 14–15 px, `tabular-nums` | 400 | 0 | 1.2 |
| Label / nav / breadcrumb | Inter | 12 px | 500 | 0.12em, mayúsculas | 1.2 |
| Editorial grande | Inter | 20–28 px | 300 | 0 | 1.3 |

Regla de tracking en mayúsculas por tamaño (refina el §8.2): ≤ 16 px → 0.12em · 17–40 px → 0.06em · > 40 px → 0.02em. Mayúsculas chicas sin tracking son el tell más barato; mayúsculas enormes con tracking amplio se desarman.

Grilla y espacio: 12 columnas, gutter 16 px mobile / 24 px desktop, márgenes 16 / 40 / 64 px (mobile / tablet / desktop), contenedor máximo 1600 px para grillas y **sin máximo** para hero, lookbook y momento 3D (full-bleed). Espaciado base 8 px; separación entre secciones 96–160 px desktop, 64–96 px mobile.

Radios: `0` en imágenes, tiles, overlays y secciones · `2px` en botones e inputs · `9999px` solo en swatches y dots. Sin `box-shadow` (los overlays se separan con `line`, no con sombra).

Ratios: `4/5` en tiles de catálogo y NEW IN · `3/4` en PDP, lookbook y editorial · `16/9` desktop y `9/16` mobile en el fashion film del hero. Un ratio por contexto, nunca dos en la misma fila.

Breakpoints: `sm` 640 · `md` 768 · `lg` 1024 · `xl` 1280 · `2xl` 1600. Mobile-first; la coreografía desktop se agrega desde `lg`.

### 3.2 Componentes del storefront (inventario de Fase 5)

`Header` · `FullscreenMenu` · `BrandEntrance` · `Hero` · `HeroToCommerce` (transición) · `ProductTile` · `NewIn` · `SignatureMoment` (3D, lazy) · `Lookbook` · `EditorialStory` · `Footer` · `Button` (sólido / outline / texto) · `TextInput` · `SizeSelector` · `Swatch` · `PriceLine` · `StockLine` · `CartDrawer` · `StickyAddToCart` (PDP mobile). Cada uno con una responsabilidad, sin estado global salvo el `MotionProvider`.

## 4. Coreografía de la home

Orden y tiempos. Todo lo que está entre paréntesis es el "cómo", no negociable salvo por un motivo escrito.

| # | Beat | Qué pasa | Duración / disparador |
|---|---|---|---|
| 1 | **Entrada de marca** | Sobre `paper`, el wordmark se revela con `clip-path: inset(0 100% 0 0 → 0)` de izquierda a derecha como si se pintara (0–450 ms), sostiene 100 ms, y se **reduce y desplaza a su posición en el header** (FLIP, 250 ms) mientras el hero se descubre debajo. Sin loader, sin barra, sin porcentaje: el contenido ya está renderizado debajo. Solo la primera vez por sesión (`sessionStorage`). | ≤ 700 ms total, al cargar |
| 2 | **Hero** | Fashion film (o foto editorial) fullscreen, sin UI salvo header y una línea de 12 px abajo a la izquierda (nombre de la colección + "Ver"). Al scrollear: la imagen escala `1 → 1.10` y se desplaza `≤ 8 %` (parallax controlado), la línea de texto se desvanece. Header con `mix-blend-mode: difference` sobre el hero (legible sobre cualquier foto sin banda blanca), sólido `paper` después. | 100 vh · scrub |
| 3 | **Hero → comercio** | La capa "imagen clave" del hero (un 3:4 dentro del film) **se contrae hasta convertirse en el primer tile de NEW IN** (GSAP Flip, 900 ms, `ease-cinema`) mientras el resto del hero se descubre con una máscara horizontal. La campaña se vuelve producto: no hay fade. Si el hero no tiene imagen clave asociada a un producto, cae al segundo modo: wipe por máscara de abajo hacia arriba. | scrub, 60 vh de recorrido |
| 4 | **NEW IN** | 2 columnas desktop (tiles de 45 vw), 1 columna + 2 chicas en mobile. Sin cards, sin sombra, sin badge. Debajo del tile: nombre (Inter 13), precio (14, tabular). Hover: crossfade a segunda imagen o loop de video de 3–5 s (700 ms, `ease-image`), sin zoom. Entrada: `imageSettle` + `fadeUp`, stagger 60 ms. | scroll, reveal una vez |
| 5 | **Momento inmersivo** | Ver §6. Sección invertida (`ink`), pineada 300 vh en desktop. | pin + scrub |
| 6 | **Lookbook** | Ver §4.1. | pin horizontal desktop · swipe nativo mobile |
| 7 | **Editorial / producto** | Una foto de campaña 3:4 (columnas 1–7) + dos tiles 4:5 (columnas 8–12) desfasados verticalmente + un link de texto "Comprar el look". Se repite como máximo dos veces con distintos looks. | scroll, reveal |
| 8 | **Footer** | Wordmark enorme (40–60 vw) en `ink`, tres columnas de 12 px (Tienda · Ayuda · Legal, con Arrepentimiento y Privacidad), Instagram y WhatsApp como texto, sin íconos de colores. Newsletter: un input inline, nunca popup. | — |

### 4.1 Lookbook

Desktop: sección pineada, el track se desplaza horizontalmente con el scroll (distancia de scroll = ancho del track − viewport). 6–8 imágenes 3:4 con alturas asimétricas (85 vh / 55 vh / 70 vh / 45 vh…) y separaciones irregulares (8–20 vw); tipografía mínima: número del look ("01") en Archivo 12 px y nombre de la prenda en Inter 12 px. Al terminar el track se despinea y el scroll vuelve a ser vertical sin salto (ScrollTrigger `pin` + `end` exacto). Sin flechas, sin dots, sin autoplay.

Mobile: **no se pinea** (secuestrar el scroll táctil es lo que más frustra). Track horizontal nativo con `scroll-snap-type: x mandatory`, mismas asimetrías escaladas, y los reveals entran con el scroll vertical.

## 5. Menú

Overlay fullscreen `paper` (Radix Dialog: foco atrapado, `Esc`, `aria-modal`). Entrada: `clip-path: inset(0 0 100% 0 → 0)` desde arriba en 450 ms `ease-out-expo`; los ítems entran por máscara con stagger 50 ms. Salida invertida en 350 ms.

- Izquierda: navegación numerada — `01` NUEVO · `02` TIENDA (con subcategorías al hover/tap, Inter 13) · `03` LOOKBOOK · `04` HAZING (marca) · `05` CONTACTO. Número en Inter 12 px 0.12em; ítem en Archivo Display XL wdth 110. Hover: el ítem no cambia de color — se desplaza 8 px y el resto baja a `ink-3` (250 ms).
- Derecha (desde `lg`): preview de imagen 3:4 contextual al ítem con crossfade 500 ms. En mobile no hay preview.
- Abajo: Cuenta · Carrito (n) · Instagram, en 12 px. (Decisión de Lazar 2026-09-03: se mantiene "Carrito" y la ruta `/carrito`, no "Bolsa".)

## 6. Momento inmersivo: "La etiqueta"

Alcance (lo fija el brief, no se rediscute): es **una sección de la home**, no una landing aparte ni algo integrado en PDP/checkout. Se carga bajo demanda solo en esa ruta. **Aprobado por Lazar el 2026-09-03** como el momento inmersivo de v1.

**Concepto.** Cada prenda de Hazing llega colgada de una percha de acero con una etiqueta de cartón con el wordmark pintado. La etiqueta es el objeto donde conviven literalmente los dos registros: el gesto (el brush sobre papel) y la precisión (el dorso tipográfico con talle, color, número de pedido, "Luján, Buenos Aires"). El momento cuenta ese pasaje: del trazo al objeto, del objeto al sistema.

**Guion vinculado al scroll** (sección pineada 300 vh en desktop; `p` = progreso 0–1):

| `p` | Cámara | Objeto | Luz | Tipografía |
|---|---|---|---|---|
| 0.00–0.10 | Macro sobre el papel: el trazo del wordmark llena el cuadro, grano visible | Etiqueta quieta | Key suave frontal | Label 12 px "01 — La marca" |
| 0.10–0.35 | Dolly-out lento revelando la etiqueta colgando de un hilo de algodón y el gancho de la percha | Péndulo mínimo (±1.5°) | Rim light que barre de izquierda a derecha | — |
| 0.35–0.65 | Fija | La etiqueta gira 180° en Y (torsión del hilo) y muestra el dorso | Key se endurece; el metal del gancho toma reflejos | Dorso legible: `HAZING` / `Luján, Buenos Aires` / `Talle · Color` / `N° HZG-000000` en Archivo |
| 0.65–0.90 | Dolly-out final: percha completa, mucho aire | Se asienta | Estable | Statement en Display XL `paper` (copy de la dueña, ver §14.6) |
| 0.90–1.00 | — | — | Fundido a `paper` | Se despinea, entra el lookbook |

Desktop suma parallax de mouse ≤ 2° sobre la cámara. No hay rotación automática ni objeto "flotando porque sí".

**Por qué este objeto y no otro.** Es el único de la lista del brief que (a) cuenta algo verdadero del producto (así llega la prenda), (b) une explícitamente RAW y FUTURE en un solo elemento, y (c) **no necesita ningún asset 3D externo**: la etiqueta es un plano con agujero, el hilo un tubo sobre una curva, el gancho un toro + cilindro, el papel un material rugoso con normal map procedural, y el wordmark se rasteriza al vuelo desde el SVG a una textura de 2048 px. Se puede construir y afinar hoy, y se puede subir de nivel más adelante con una prenda escaneada (GLB) sin tirar nada.

**Alternativas descartadas.** _Tela simulada con el logo_: espectacular, pero la simulación es cara en mobile y el fallback estático pierde el sentido. _Lettering HAZING esculpido/extruido_: un trazo brush extruido se ve barato (bordes finos, sin masa) y el mensaje es "logo girando". _Prenda 3D / bolsa transparente_: mejor narrativa pero requiere un artista 3D o fotogrametría (asset A5) — queda como upgrade v2.

**Técnica.** React Three Fiber + drei, en un chunk propio cargado solo cuando la sección está a ≤ 2 viewports (IntersectionObserver `rootMargin: 200%`), nunca en el bundle inicial ni en otras rutas. `dpr` máximo 1.5, sombras de contacto solo desktop, luces con `Lightformer` (sin HDR externo). El scroll controla la escena vía ScrollTrigger (`scrub: 0.8`), no al revés.

**Mobile y fallbacks.** Mobile: misma escena sin pin (progreso por posición de la sección), `dpr` 1, sin sombras, sin parallax de mouse. Dispositivos con `deviceMemory < 4` o `prefers-reduced-motion`: se sirve un **still pre-renderizado de la escena** (AVIF, exportado desde el propio componente en desarrollo) con la misma secuencia tipográfica en 2D. Si WebGL falla, el mismo still. En ningún caso la sección desaparece ni bloquea nada.

## 7. Página de producto (se construye en Fase 6, se diseña acá)

Commerce primero. Desktop: galería a la izquierda (columnas 1–7) con las imágenes 3:4 apiladas verticalmente, sin carrusel ni flechas; información **sticky** a la derecha (columnas 8–12): nombre (Archivo 24), precio (Inter 16 tabular), color como swatches `9999px` de 20 px con nombre en texto, talles como botones de texto radio 2 px (el agotado va tachado + "Agotado", nunca en gris claro), botón "Agregar al carrito" sólido `ink` de alto 48, "Guía de talles" y "Envíos y cambios" como acordeones de línea. Video de producto opcional en la galería (loop mudo con poster). "Ver en 3D" aparece **solo** si el producto tiene modelo cargado (campo nuevo en Fase 6/7), abre bajo demanda y no carga three de antemano.

Mobile: galería horizontal con `scroll-snap`, contador "1 / 4" en 12 px, información debajo, y **barra sticky inferior** con precio + talle seleccionado + "Agregar" (Baymard: +5–12 % conversión). Sticky solo cuando el botón principal salió del viewport.

## 8. Motion system (uno solo, para todo el sitio)

Carácter: suave, con peso, deliberado, editorial. **Nunca rebota.**

Tokens (CSS y GSAP comparten valores):

| Token | Valor | Uso |
|---|---|---|
| `--dur-micro` | 150 ms | color, borde, opacidad en hover/focus |
| `--dur-ui` | 250 ms | botones, swatches, ítems de menú |
| `--dur-overlay` | 450 ms | menú, drawer de carrito |
| `--dur-image` | 700 ms | crossfade de imagen, swap de tile |
| `--dur-cinema` | 1200 ms | hero, transición hero → comercio |
| `--ease-ui` | `cubic-bezier(0.4, 0, 0.2, 1)` | micro y UI |
| `--ease-out-expo` | `cubic-bezier(0.16, 1, 0.3, 1)` | máscaras, reveals, menú |
| `--ease-cinema` | `cubic-bezier(0.65, 0, 0.35, 1)` | movimientos de imagen y cámara |

Primitivas (las únicas cuatro; todo se compone con ellas): `maskReveal` (clip-path inset → 0), `fadeUp` (opacidad 0→1 + `translateY` 12 px), `imageSettle` (scale 1.06 → 1, 900 ms), `lineDraw` (`scaleX` 0 → 1 en reglas). Stagger 40–60 ms. Scroll-linked siempre con `scrub` 0.6–1 (el retraso es lo que se percibe como peso). Pins: solo el momento 3D y el lookbook desktop. Ninguna animación dispara `scrollTo`.

Reparto de responsabilidades: **CSS** para hover/focus/estado (micro y UI); **GSAP + ScrollTrigger** para todo lo secuenciado o ligado al scroll; **Flip** para hero → tile y wordmark → header; **Lenis** solo en desktop con puntero fino (`lerp` 0.09), nunca en táctil, para que el scrub tenga inercia sin perder el scroll nativo.

`prefers-reduced-motion`: GSAP `matchMedia` — todas las duraciones a 0 salvo opacidad (150 ms), sin scrub, sin pins, Lenis desactivado, momento 3D en still, swaps de imagen instantáneos, video del hero reemplazado por su poster. Es un modo de primera clase, no una excepción.

Prohibido (del brief): spring con overshoot, animar todo, scroll hijacking agresivo, parallax excesivo (> 10 %), cursores custom, tilt, glassmorphism, glows, gradientes, marquees, cards redondeadas, animación sin intención.

## 9. Mobile: coreografía propia

- Entrada de marca idéntica (≤ 700 ms).
- Hero con film vertical 9:16 (o foto 4:5); mismo scrub de escala; la transición hero → tile se conserva (Flip funciona igual).
- NEW IN: 1 tile grande (100 vw, 4:5) + 2 tiles de 50 vw, para que el primer producto tenga presencia.
- Momento 3D: sin pin, `dpr` 1, sin sombras; still si el dispositivo no da.
- Lookbook: swipe nativo con snap, sin pin.
- Menú: mismo overlay, sin preview, ítems de ≥ 56 px de alto.
- PDP: barra sticky de compra.
- Gestos naturales: nada intercepta el scroll ni el back del navegador.

## 10. Performance

Targets del brief como presupuesto duro (se miden con Lighthouse en `preview:worker`, móvil simulado, y se anotan en el cierre de cada sub-fase):

| Métrica | Target | Cómo se logra |
|---|---|---|
| LCP | ≤ 2.5 s | El LCP es el **poster** del hero (AVIF ≤ 120 KB, `priority`, `fetchpriority=high`), nunca el video. El film carga después del LCP y solo con `(prefers-reduced-data: no-preference)`. |
| INP | ≤ 200 ms | GSAP core + ScrollTrigger + Flip ≈ 50 KB gz en el bundle del storefront; three/R3F ≈ 400 KB gz en un chunk lazy solo de la home; nada de trabajo en main thread antes de la primera interacción. |
| CLS | ≤ 0.1 | `aspect-ratio` en todo contenedor de imagen/video; fuentes con `display: swap` + `size-adjust` (lo hace `next/font`); la entrada de marca es un overlay, no desplaza layout. |

Presupuestos de bundle: JS inicial de cualquier ruta del storefront ≤ 220 KB gz; chunk 3D ≤ 450 KB gz; worker de Cloudflare sin three ni lenis (verificado con grep en `.open-next/worker.js` — límite del plan Free: 3 MB gz). Los números medidos del spike están en el ADR 0003. Atención: `pnpm build:worker` no corre en la máquina actual (EPERM de symlink de Windows, también sin cambios), así que el gate del worker se agrega al job `quality` de CI en 5.1 y se mide ahí.

Imágenes: los assets de campaña (estáticos, `public/`) se pre-codifican en build a AVIF + WebP en 4 anchos (640 / 1080 / 1600 / 2400) con `sharp` (script de repo, no runtime), y se sirven con `srcset` — cero costo de runtime y cero dependencia de Cloudflare Images. Las imágenes de producto (Supabase Storage) se resuelven en Fase 6/7; el precedente propio es el compresor en subida de glamify (`src/lib/images/compress.ts`), que evita pagar Cloudflare Images. Video: MP4 H.264 + WebM/AV1, poster obligatorio, `muted playsinline autoplay loop preload="none"` fuera del hero.

## 11. Accesibilidad (además de `04-calidad.md`)

Menú y drawer con Radix Dialog. Los reveals ocultan con `visibility`/`clip-path`, no con `display:none`, y el contenido siempre está en el HTML del servidor. Video decorativo `aria-hidden` con poster. Tiles son `<a>` con el nombre completo. Mayúsculas por `text-transform` (el lector de pantalla lee la capitalización real). Contraste según §3.1. Touch targets ≥ 44 px. `@axe-core/playwright` en verde sobre home, menú abierto y PDP.

## 12. Assets — qué hace falta producir, exacto

Regla del brief: si falta un asset, **no se inventa un sustituto con CSS**. Las secciones se construyen contra "slots" con la especificación impresa (marco `line-2` con el código del asset y sus medidas), y solo se declaran terminadas con el asset real.

| Código | Asset | Especificación | Dónde se usa | Bloquea |
|---|---|---|---|---|
| **A1** | Wordmark vectorial | SVG del logo original (pedir al diseñador). Mientras tanto: trazado automático desde `logo.jpeg` (ver §15), suficiente para header/footer/entrada, no para impresión. | Entrada, header, footer, textura de la etiqueta, favicon, OG | 5.1 |
| **A2** | Fashion film del hero | 1 clip de 8–15 s en loop, sin audio, sin texto quemado. Desktop 16:9 a 3840×2160 (o 1920×1080), mobile 9:16 a 1080×1920. Entregar ProRes/máxima calidad; el repo genera MP4 H.264 + WebM ≤ 4 MB desktop / ≤ 2 MB mobile y el poster AVIF. Contenido: modelo en movimiento, fondo neutro, 1–2 prendas de la colección, luz natural o de estudio limpia. | Hero (beats 2–3) | 5.2 |
| **A2b** | Foto de hero (si no hay film) | 1 still: desktop 3:2 a 2880×1920 y mobile 4:5 a 1600×2000, misma toma o dos tomas hermanas. | Hero fallback | 5.2 |
| **A3** | Fotografía de campaña | Mínimo 8 imágenes: 6 verticales 3:4, 2 horizontales 3:2, lado largo ≥ 3000 px, colorimetría neutra consistente (piel real, fondo blanco / gris / hormigón), sin filtros. Una de ellas tiene que ser la "imagen clave" que enlaza hero → primer producto (misma prenda que el tile 1). | Lookbook (6–8), editorial (2–3), previews del menú (5), OG | 5.2 |
| **A4** | Fotografía de producto | Por producto: frente, dorso, detalle, en modelo — 4:5 a 2000×2500, fondo `#FAFAFA` sin sombra dura, misma luz para todo el catálogo (la consistencia entre productos es el tell número uno). Opcional: loop de video 3–5 s en 4:5 ≤ 1 MB para el hover. | Tiles, NEW IN, PDP | Fase 6 |
| **A5** | Prenda 3D (upgrade v2 del momento inmersivo) | GLB con Draco, ≤ 50 k triángulos, texturas PBR 2K, ≤ 2 MB. Origen: CLO/Marvelous Designer o fotogrametría. **No bloquea v1**: "La etiqueta" se construye sin assets 3D externos. | Momento 3D v2, "Ver en 3D" en PDP | — |
| **A6** | Arte de la etiqueta | Frente: wordmark sobre cartón. Dorso: layout tipográfico (lo diseña este equipo con Archivo/Inter). Se usa como textura; no requiere impresión, pero conviene que coincida con la etiqueta física real. | Momento 3D | 5.3 |
| **A7** | Copy | Nombre de la colección o statement de una línea (ES), nombres de categorías definitivos, texto de "Hazing" (marca) para el ítem 04 del menú. | Hero, momento 3D, menú | 5.2 / 5.3 |
| **A8** | Datos de contacto | Instagram y WhatsApp confirmados (del intento anterior: `hazing.ok` y `+54 9 2323 52-9931`, sin confirmar). | Footer, menú, contacto | 5.1 |

Conjunto mínimo para lanzar con esta dirección: **A1 + A3 (8 fotos) + A4 (catálogo completo) + A2b (still) + A7 + A8**. El film (A2) mejora el hero pero no es condición. Sin A3 no hay lookbook ni editorial: la home se reduce a hero + NEW IN + momento 3D + footer, y eso no alcanza para el criterio de éxito.

Estado al 2026-09-03 (decisión de Lazar): **no hay producción de campaña todavía**. 5.1 y 5.3 se construyen completas; 5.2 se arma contra slots con la spec impresa y se cierra recién con A2b/A3 reales. Esta tabla es lo que hay que pasarle al fotógrafo cuando exista.

## 13. Plan de ejecución (sub-fases)

Orden pensado para no depender de assets al principio y atacar primero el riesgo técnico.

| Sub-fase | Contenido | Depende de | Presupuesto |
|---|---|---|---|
| **5.1 Fundaciones** ✅ cerrada 2026-09-04 | Tokens (`globals.css`, `tailwind.config.ts`), Archivo variable, `src/lib/motion/*`, `Header`, `FullscreenMenu` (con slots de preview), `Footer`, `BrandEntrance`, `Button`, `TextInput`, `SizeSelector`, `Swatch`, `PriceLine`, `StockLine`, `ProductTile` (con slot), `Wordmark` (SVG inline). Tests unitarios de tokens, E2E de shell + axe + regresión de foco. Commits `97443c8` (fundaciones) + `865a5f4` (shell). Cerrada con revisión adversarial (1 bloqueante de accesibilidad encontrado y corregido) + gate de release GO. | A1 (trazado automático alcanza) | 26 archivos, ~1150 líneas |
| **5.3 Momento inmersivo** | `src/components/immersive/*`: escena, guion de scroll, carga lazy, fallback still, pipeline para exportar el still. Se hace antes que la home porque es el mayor riesgo y no depende de fotos. | 5.1, A6, A7 | ~8 archivos |
| **5.2 Home** | `Hero` (film/still + poster), `HeroToCommerce` (Flip), `NewIn`, `Lookbook`, `EditorialStory`, script de pre-codificación de imágenes. Se construye contra slots; se cierra con A2/A3. | 5.1, A2b/A3 | ~12 archivos |
| **5.4 Performance y mobile** | Lighthouse en `preview:worker` (móvil), presupuesto de bundles verificado, pasada de coreografía mobile, axe completo. | 5.1–5.3 | ajustes |
| PDP | Se implementa en Fase 6 con datos reales, siguiendo §7. | Fase 6 | — |

Cada sub-fase cierra con: juez del repo en verde (`format:check`, `lint`, `typecheck`, `test`), `pnpm build:worker` sin three/lenis en el worker, flujo corrido en el navegador por un verificador de UX con contexto fresco, revisión adversarial del diff y gate de release. Sin los cuatro no está cerrada.

## 14. Decisiones de Lazar / la dueña

Tomadas el 2026-09-03/04:

1. **Momento inmersivo:** "La etiqueta" (§6). Aprobado.
2. **Producción de assets:** no hay todavía. 5.1 y 5.3 avanzan completas; 5.2 se construye contra slots (§12).
3. **Copy del carrito:** se mantiene "Carrito" y `/carrito`. "Bolsa" descartado.
4. **Lectura completa:** hecha. Arranca 5.1.
5. **Logo:** Lazar gestiona el vector original con el diseñador. Hasta que llegue, el trazado automático (`public/brand/hazing-wordmark.svg`) es la versión oficial.
6. **Copy (A7):** delegado a este equipo ("dale"). Borrador en `src/lib/content/copy.ts`, marcado `[BORRADOR]` — la dueña lo edita cuando quiera, es un solo archivo.
7. **Contacto (A8):** confirmado — Instagram `hazing.ok`, WhatsApp `+54 9 2323 52-9931`.
8. **Sección invertida (fondo `ink`) solo para el momento 3D:** aprobada junto con "La etiqueta".
9. **Build del worker en local:** sigue bloqueado por el symlink de Windows (no es Docker — es un permiso del sistema operativo para crear enlaces simbólicos, que pide `next build` en modo standalone). No se activa desde acá (cambiar configuración del sistema es una acción que le corresponde a Lazar, no a este asistente). El gate del worker se mide en CI (Linux) desde esta sub-fase — ver `.github/workflows/ci.yml`.

## 15. Ledger de delegaciones de esta fase

Se completa al cierre de cada sub-fase (finalidad · costo aproximado · resultado en una línea).

- 2026-09-03 · investigación de referencias (Sonnet, solo web, ~100 k tokens, 26 llamadas) · confirmó GSAP+ScrollTrigger en khaite.com y WebGL solo en momentos puntuales; Jacquemus/Balenciaga bloqueados — ver §1.1.
- 2026-09-03 · spike de stack (Sonnet, worktree aislado, ~82 k tokens, 55 llamadas, 26 min): gsap 3.15 + three 0.185 + R3F 9.7 + drei 10.7 + lenis 1.3 · GO en `pnpm build`, typecheck y 116 tests; three/lenis fuera del server bundle; `build:worker` bloqueado en esta máquina por EPERM de symlink (también en baseline) — detalle en [ADR 0003](../decisions/0003-motion-y-3d.md).
- 2026-09-03 · vectorización del wordmark desde `logo.jpeg` (Sonnet, scratchpad, ~45 k tokens) · SVG limpio: viewBox `0 0 1821 549`, un solo `<path>` (7 sub-trazos = 6 letras), `fill="currentColor"`, 21 KB; revisado visualmente contra el JPEG (1079×1078), fiel al trazo. Gotcha: el JPEG trae una línea negra de 2 px en el borde inferior (artefacto del exportador) que hay que recortar antes de trazar. Se copia a `public/brand/hazing-wordmark.svg` en 5.1.
