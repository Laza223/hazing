# Research de referencias — dirección de arte Hazing

Metodología: WebSearch + WebFetch (renderizado a markdown, sin ejecución JS) + `curl` directo al HTML fuente para grep de nombres de librerías. `curl` no ejecuta JS, así que confirma *presencia* de scripts/plataforma pero no logra medir duraciones/easings reales salvo que estén en el HTML/CSS servido. Jacquemus y Balenciaga devolvieron HTTP 403 (bot-block) tanto a `curl` como a WebFetch — para esos dos, todo lo que sigue es de fuentes de terceros y queda marcado "no verificado en vivo".

---

## 1. Weekend Max Mara — "Holiday Edit" por MONOGRID

Fuentes: [awwwards.com/sites/weekend-max-mara-holiday-edit](https://www.awwwards.com/sites/weekend-max-mara-holiday-edit), [monogrid.com/en/project/weekend-max-mara-the-holiday-edit](https://monogrid.com/en/project/weekend-max-mara-the-holiday-edit) (WebFetch a esta última no devolvió contenido legible — página probablemente carga todo vía JS/canvas, sin texto extraíble).

- **Tech confirmada (Awwwards):** WebGL + GSAP + Vue.js + Contentful (CMS headless). SOTD 24-ene-2026, score 7.21/10, Dev Award animaciones/transiciones 7.20/10, responsive 7.40/10.
- **Concepto:** "a CGAI-crafted alpine world" — mundo 3D navegable como hilo narrativo del holiday gift guide (Awwwards).
- **Scroll narrative / fallback mobile / objetos 3D específicos:** no verificado en vivo — el case study propio de MONOGRID no fue legible por WebFetch y no se encontró cobertura de terceros (Behance/FWA) con ese nivel de detalle en la búsqueda.

## 2. khaite.com

Fuente: HTML servido (`curl`, UA desktop), 200 OK, ~740KB.

- **Tech confirmada:** Shopify (`Shopify`, `SHOPIFY` en HTML) + tema con React embebido (`react` aparece en bundles) + **GSAP con plugin ScrollTrigger** (`gsap.min.js`, `gsap.registerPlugin(ScrollTrigger)`, `gsap.matchMedia()` — es decir, usan matchMedia de GSAP para animaciones responsive-aware) + **Swiper** (`swiper-container`, `swiper-pagination-bullet`, `swiper-scrollbar`) para carruseles/hero. Mención literal de `webgl` en el bundle (alcance no confirmable sin ejecutar JS).
- **Botones:** CSS custom properties para estado hover (`--primary-button-bg-color-hover: #fff`, texto pasa a negro) — inversión de color simple en hover, transición `border-color .3s, background-color .3s, color .3s` (300ms, sin easing custom declarado → default ease).
- **Menú, hero, PDP, product-tile hover:** no verificado en vivo — el grep sobre el HTML crudo no encontró clases de hover de producto ni de galería (probablemente inyectadas por JS/CSS async que `curl` no captura). Se necesitaría un fetch con render JS real para confirmar.

## 3. toteme-studio.com (redirige a toteme.com)

Fuente: HTML servido (`curl -L`), redirige 301 → `https://toteme.com/en-int`, 200 OK, ~430KB.

- **Tech confirmada:** Shopify + React (bundle contiene `react`, `vItems`, y token `vite` — sugiere tooling Vite en el pipeline de build del tema, aunque podría ser falso positivo de string).
- **No se detectaron** menciones de GSAP, Lenis, Locomotive Scroll, Swiper ni Three.js en el HTML servido — o no están, o se cargan en chunks con nombres hasheados no reconocibles por grep de texto.
- **Menú, hero, transiciones, PDP:** no verificado en vivo (mismo límite de `curl` sin JS).

## 4. jacquemus.com

Fuente: `curl` → HTTP 403. WebFetch → HTTP 403. Todo lo siguiente es de terceros, **no verificado en vivo**, y corresponde a una versión de 2018 del sitio (posiblemente ya reemplazada):

- Awwwards ([awwwards.com/sites/jacquemus](https://www.awwwards.com/sites/jacquemus)): SOTD 25-jun-2018 por la agencia "Period • Paris". Stack listado: **WordPress + WooCommerce + PHP + Nginx + jQuery + GSAP + Modernizr + Font Awesome**. Categorías: "Big Background Images", "Clean", "Flat Design", "Minimal", "Transitions". Score dev 6.89/10 (accesibilidad 6.00/10, la nota más baja).
- Esto es evidencia de que la marca ya usaba GSAP + transiciones full-bleed hace años, pero **no dice nada del sitio actual** (2026) — no asumir que sigue vigente.

## 5. acnestudios.com

Fuente: `curl -L` → redirige 301 a `/select-location` (location/country gate), 200 OK, ~44KB.

- **Tech confirmada:** **Salesforce Commerce Cloud / Demandware** (`Demandware`, `demandware` en el HTML del gate). Esto es consistente con muchas marcas de lujo grandes (SFCC es común en ese segmento).
- **Todo lo demás** (menú, hero, PDP, hover de producto) queda detrás del selector de país/idioma — no verificado en vivo con este método de solo-lectura sin ejecutar JS ni completar el gate.

## 6. coperni.com

Fuente: HTML servido (`curl`), 200 OK, ~780KB (home) y ~1.1MB (`/collections/all`).

- **Tech confirmada:** Shopify + React en el bundle (mismo patrón que Toteme — probablemente mismo proveedor de tema/Hydrogen-like stack).
- **Product tile (página de colección):** clases `product-card`, y sistema de **swatches de color** explícito: `swatch`, `swatch--background`, `swatch-dot`, `swatch-label`, `swatch-outline-color` — confirma que el tile de producto muestra selector de color (dots) sin necesariamente cambiar de foto en el grid (no se pudo confirmar hover de segunda imagen ni video con este método).
- **No se detectaron** GSAP/Lenis/Locomotive/Three en el HTML servido.

## 7. balenciaga.com

Fuente: `curl` → HTTP 403. WebFetch → fetch rechazado. Todo lo siguiente es de terceros y es **histórico** (rediseño de 2017 por Bureau Borsche, no necesariamente el sitio actual), **no verificado en vivo**:

- [It's Nice That, 2017](https://www.itsnicethat.com/news/bureau-borsche-balenciaga-website-redesign-010317): rediseño de Bureau Borsche (Mirko Borsche) — "grid system básico" tipo catálogo, logo reducido a esquina superior izquierda, imágenes de producto sin styling lifestyle, checkout descripto como "fast and fun". Sin detalle de animaciones/motion.
- Búsqueda adicional menciona que AREA17 también trabajó en la plataforma ecommerce de Balenciaga en algún momento (sin case study con detalle técnico verificable).
- Paleta histórica: blanco/negro con **verde neón como único acento** (dato de terceros, no confirmado en el sitio vivo actual).

## 8-9. Awwwards Site of the Day — moda/ropa, 2025-2026

Búsqueda dirigida a "awwwards fashion ecommerce site of the day 2025/2026" — resultados relevantes con fecha y agencia confirmadas por Awwwards:

### 8. Max Mara — "Jacket Circle" (Adoratorio Studio, SOTD 16-abr-2026)

Fuente: [awwwards.com/sites/max-mara-jacket-circle](https://www.awwwards.com/sites/max-mara-jacket-circle)

- **Tech:** GSAP + **PixiJS** (renderer 2D/WebGL) + HTML5.
- **Concepto:** interacción tipo juego ("game-based layout interaction") — "una serie de mundos imaginarios a través de los cuales las mujeres dan forma a su guardarropa cotidiano".
- Score 7.34/10 (creatividad 7.75, usabilidad más baja 6.86). Paleta de 2 colores (#E59291 rosa / #E7D497 mostaza) — nota: **no monocromo**, es referencia de mecánica de interacción, no de paleta.
- Menú/hero/PDP detallados: no verificado en vivo (no se hizo fetch directo al sitio del proyecto, solo a la ficha de Awwwards).

### 9. MIU MIU — "A House that we shaped" (Merci Michel, SOTD 25-ago-2026)

Fuente: [awwwards.com/sites/miu-miu-a-house-that-we-shaped](https://www.awwwards.com/sites/miu-miu-a-house-that-we-shaped)

- **Tech confirmada:** WebGL + **Three.js**.
- **Microinteracciones nombradas explícitamente por Awwwards:** "Outside view transition" (transición con video), "Viewmaster interaction", "Colors interaction" (selector de color dinámico), "Matelassé interaction" (visualización de textura de material), "In and Out transition", "Phone interaction" (interfaz tipo teléfono).
- Dev Award 7.59/10 — **Animaciones/Transiciones 8.20/10** (el más alto de todos los sitios relevados acá), WPO 8.00/10, accesibilidad más baja (6.80/10) — patrón: alto nivel de motion casi siempre castiga accesibilidad/WPO en el juicio de Awwwards.
- Objetivo declarado: "Explore the house and interact with the objects to discover the new Miu Miu Bags collection" — **exploración de objetos 3D de una casa para descubrir bolsos**, referencia directa aplicable a un "momento inmersivo con hangtag/percha".

### Extra (no pedido pero relevante, no incluido como sitio separado): Brunello Cucinelli — "AI E-com" (makemepulse, SOTD 9-jul-2026)

Fuentes: [awwwards.com/sites/brunello-cucinelli-ai-e-com](https://www.awwwards.com/sites/brunello-cucinelli-ai-e-com), [makemepulse.com case study](https://www.makemepulse.com/case-study/brunello-cucinelli-ai-shopping-experience)

- Arquitectura "pageless, intent-led": sin páginas fijas, IA multi-agente reordena "más de 30 bloques/widgets de interfaz en tiempo real" según "receptors" de intención (product-driven / discovery-led / inspirational). Cita textual (<15 palabras): *"the interface is never static"*.
- Estética: *"frosted glass effects, soft blur and hand-drawn sketch details"* (cita <15 palabras).
- **Sin librerías nombradas** (ni GSAP ni Three.js aparecen en la documentación disponible) — la innovación es de arquitectura/IA, no de motion library. Diferencias mobile/desktop: no documentadas en la fuente.
- Relevancia para Hazing: es demasiado complejo/caro (multi-agente IA) para v1, pero la idea de "intent receptors" que reordenan bloques es un patrón de layout adaptable, no de motion — dejar fuera del alcance de un ecommerce chico.

---

## Patrones que se repiten en ≥3 sitios

1. **GSAP como motor de animación dominante en fashion e-commerce de alto nivel.** Confirmado en vivo en khaite.com (`gsap.min.js` + `ScrollTrigger` + `matchMedia`), y por fuentes de terceros en MONOGRID/Weekend Max Mara, Max Mara Jacket Circle y Jacquemus (histórico). 4 de 9 referencias.
2. **Shopify como plataforma base con capa React/Hydrogen-like encima**, no un theme Liquid puro. Confirmado en vivo en khaite.com, toteme.com y coperni.com (3/3 de los sitios que respondieron con HTML legible traían `react` + `shopify` en el bundle).
3. **WebGL/Three.js/PixiJS para "momentos" puntuales (hero o campaña), no para todo el sitio.** MONOGRID/Weekend Max Mara (WebGL), Max Mara Jacket Circle (PixiJS), MIU MIU (Three.js) — los tres son *microsites de campaña*, no el ecommerce transaccional día a día.
4. **Swatches de color como dots/chips en el tile de producto**, no como thumbnails de foto. Confirmado en vivo en coperni.com (`swatch-dot`, `swatch-outline-color`) y visible en khaite.com (Swiper + estructura de tile), consistente con lo que se ve tipear en la mayoría de PDPs de moda premium (patrón de industria, no solo estos 2 sitios).
5. **El Dev Award de Awwwards penaliza sistemáticamente accesibilidad cuando el motion es alto**: Weekend Max Mara (creatividad 7.49 vs. sin dato de accesibilidad reportado), MIU MIU (animaciones 8.20 pero accesibilidad 6.80, la nota más baja del sitio), Brunello Cucinelli AI E-com (accesibilidad 6.60, la más baja de sus sub-scores) — 3/3 casos con dato de accesibilidad muestran ese sub-score como el más bajo o cerca del más bajo del dev award.
6. **Transiciones de 300ms con easing por defecto (no custom) en microinteracciones de botón**, al menos en khaite.com (`transition: border-color .3s, background-color .3s, color .3s` sin `cubic-bezier` declarado) — un solo dato duro, no alcanza para "patrón de ≥3" pero es la única duración verificada en CSS crudo de todo el research; se marca acá para no perderla.

## Anti-patrones vistos

- Ningún sitio relevado (de los que se pudo verificar) usa badges rojos, countdowns ni carruseles con flechas grandes — consistente con el veto ya existente en `docs/spec/00-handoff.md` §8 de Hazing.
- El caso Brunello Cucinelli muestra el riesgo opuesto: **complejidad de IA multi-agente que resigna accesibilidad y SEO/semántica** (sub-scores más bajos del dev award) a cambio de personalización — mal candidato a imitar en v1 de un ecommerce chico sin equipo de IA dedicado.
- Jacquemus (dato histórico 2018) tenía accesibilidad como su sub-score más débil (6.00/10) ya usando WordPress/jQuery — el problema de accesibilidad-vs-motion no es nuevo ni exclusivo de sitios WebGL.

## Ideas robables para un momento inmersivo 3D con hangtag/percha/etiqueta de prenda

Basado en los 3 casos con WebGL/3D confirmado (MONOGRID/Weekend Max Mara, Max Mara Jacket Circle, MIU MIU — ninguno usa colgador/hangtag literalmente, así que esto es extrapolación de sus mecánicas, marcado como tal):

- **"Viewmaster interaction" de MIU MIU** (nombre literal de Awwwards) — mecánica de mirar a través de/rotar un objeto para revelar contenido. Aplicable: la etiqueta/hangtag como objeto que el usuario "gira" con el scroll o drag para revelar info de tela/talle en vez de un tooltip plano.
- **"Matelassé interaction" de MIU MIU** — visualización de textura de material como interacción dedicada, no como foto estática. Aplicable a Hazing: un momento donde la percha/etiqueta muestra de cerca la tela con un micro-drag o scroll-linked zoom, en vez de un swatch chico.
- **Mecánica "game-based" de Max Mara Jacket Circle** (PixiJS, no motor 3D pesado) — demuestra que no hace falta Three.js/WebGL completo para lograr un momento memorable; PixiJS (2D acelerado) es más liviano y más realista para el presupuesto de Hazing que un mundo 3D tipo MONOGRID.
- **"Alpine world" CGAI de MONOGRID** — un solo objeto/escena ancla (no un catálogo 3D completo) sirve de hilo narrativo para todo un gift guide. Aplicable: un solo objeto (percha con la prenda colgada) como ancla visual de una página especial (ej. "nueva colección"), no de todo el sitio.
- **Advertencia de costo-beneficio, no solo idea robable:** los 3 casos con 3D son de agencias especializadas (MONOGRID, Adoratorio, Merci Michel) para *microsites de campaña* de marcas con presupuesto de ese tamaño — para Hazing v1 esto es candidato a **Fase 5+/nice-to-have**, no a la v1 del ecommerce transaccional, y debería quedar explícitamente fuera del "código mínimo" del núcleo salvo que Lazar lo apruebe como inversión de marca puntual (ver REQUIERE INPUT abajo).

---

**REQUIERE INPUT (para Lazar, no resuelto acá):** ¿el "momento inmersivo 3D con hangtag" es una pieza de una sola página de campaña (ej. landing especial) o se espera integrado en el flujo normal de PDP/checkout? Cambia completamente el presupuesto de implementación (PixiJS puntual en una landing vs. Three.js en el core del storefront).
