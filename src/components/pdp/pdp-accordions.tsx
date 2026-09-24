import { SIZE_GUIDE_COPY, SHIPPING_AND_RETURNS_COPY } from "@/lib/content/copy";

/**
 * PdpAccordions — "Guía de talles" y "Envíos y cambios" con `<details>`/
 * `<summary>` nativos, sin dependencia nueva (docs/spec/05-direccion-arte.md
 * §7, docs/spec/06-storefront.md §3.5).
 */
export function PdpAccordions() {
  return (
    <div className="divide-y divide-line border-y border-line text-sm">
      <AccordionItem title="Guía de talles">{SIZE_GUIDE_COPY}</AccordionItem>
      <AccordionItem title="Envíos y cambios">
        {SHIPPING_AND_RETURNS_COPY}
      </AccordionItem>
    </div>
  );
}

function AccordionItem({
  title,
  children,
}: {
  title: string;
  children: string;
}) {
  return (
    <details className="group py-4">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-ink outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">
        <span className="tracking-caps-sm text-xs uppercase">{title}</span>
        <span
          aria-hidden="true"
          className="text-ink-3 transition-transform duration-ui ease-ui group-open:rotate-45"
        >
          +
        </span>
      </summary>
      <p className="mt-3 text-sm leading-relaxed text-ink-2">{children}</p>
    </details>
  );
}
