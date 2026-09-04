import {
  BRAND_STATEMENT,
  SIGNATURE_MOMENT_LABEL,
  SIGNATURE_MOMENT_TAG_BACK,
} from "@/lib/content/copy";

/**
 * Fallback estático del momento inmersivo "La etiqueta" — SIN scroll-linking,
 * sin GSAP, sin ScrollTrigger (docs/spec/05-direccion-arte.md §6 "Mobile y
 * fallbacks"). Se sirve cuando `canRunSignatureMomentScene` da `false`
 * (reduced-motion, memoria baja o sin WebGL): en ningún caso la sección
 * desaparece ni bloquea nada.
 *
 * Motion: solo el fade-in CSS de 150ms al montar, ya cubierto por la regla
 * global `prefers-reduced-motion` de globals.css — no hace falta lógica
 * propia acá.
 *
 * Still: A6 no producido todavía (§12) — se muestra el slot con la
 * especificación pendiente, NO se inventa un sustituto CSS (mismo patrón
 * que ProductTile cuando falta `imageSrc`).
 */
export function SignatureMomentFallback(): React.JSX.Element {
  return (
    <section className="flex min-h-[100svh] flex-col justify-center gap-10 bg-ink px-4 py-16 text-paper md:px-10">
      <p className="tracking-caps-sm font-sans text-xs uppercase text-paper">
        {SIGNATURE_MOMENT_LABEL}
      </p>

      <div className="flex aspect-[4/5] w-full max-w-sm items-center justify-center border border-ink-2 bg-ink-2/20 p-6 text-center text-xs text-paper-2">
        A6 · still de la etiqueta pendiente (AVIF, ver §12)
      </div>

      <p className="tracking-caps-sm font-display text-xs uppercase text-paper md:text-sm">
        {`HAZING — ${SIGNATURE_MOMENT_TAG_BACK.origin} — ${SIGNATURE_MOMENT_TAG_BACK.sizeColorLabel} — ${SIGNATURE_MOMENT_TAG_BACK.exampleOrderNumber}`}
      </p>

      <p className="tracking-caps-lg max-w-2xl font-display text-3xl uppercase text-paper md:text-5xl">
        {BRAND_STATEMENT}
      </p>
    </section>
  );
}
