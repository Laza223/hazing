import Link from "next/link";

import { Wordmark } from "@/components/brand/wordmark";
import {
  SOCIAL_INSTAGRAM_HANDLE,
  SOCIAL_INSTAGRAM_URL,
  CONTACT_WHATSAPP_DISPLAY,
  CONTACT_WHATSAPP_URL,
} from "@/lib/content/copy";
import { businessInfo } from "@/lib/legal/business-info";

interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
}

// Rutas reales (sub-fases 6.2/6.3/6.5). Lookbook ancla a la sección de la
// home (`id="lookbook"` en src/components/home/lookbook.tsx).
const SHOP_LINKS: FooterLink[] = [
  { label: "Novedades", href: "/tienda?orden=novedades" },
  { label: "Tienda", href: "/tienda" },
  { label: "Lookbook", href: "/#lookbook" },
];
const HELP_LINKS: FooterLink[] = [
  { label: "Envíos y cambios", href: "/envios-y-cambios" },
  { label: "Guía de talles", href: "/guia-de-talles" },
  { label: "Preguntas frecuentes", href: "/preguntas-frecuentes" },
  { label: "Contacto", href: "/contacto" },
];
const LEGAL_LINKS: FooterLink[] = [
  { label: "Botón de Arrepentimiento", href: "/arrepentimiento" },
  { label: "Privacidad", href: "/privacidad" },
  { label: "Términos", href: "/terminos" },
  {
    label: "Defensa del Consumidor",
    href: businessInfo.consumerDefenseUrl,
    external: true,
  },
];

/**
 * `inline-flex min-h-11` (44px): un link de texto de 12px mide ~16px de alto
 * y queda por debajo del target táctil que exigen §11 y docs/spec/04-calidad.md.
 * La medición de la sub-fase 5.4 encontró 25 elementos así en mobile — es una
 * clase de problema (link de texto en mayúsculas sin padding), no casos
 * sueltos, así que el arreglo va en la clase compartida.
 */
const linkClass =
  "inline-flex min-h-11 items-center text-xs uppercase tracking-caps-sm text-ink-3 outline-none transition-colors duration-ui ease-ui hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

/**
 * Footer — wordmark enorme en `ink`, tres columnas de texto 12px
 * (docs/spec/05-direccion-arte.md §4 beat 8). Sin newsletter: no hay backend
 * para eso todavía (fuera de alcance de esta tarea).
 */
export function Footer() {
  return (
    <footer className="border-t border-line bg-paper px-4 pb-10 pt-16 md:px-10">
      <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
        <FooterColumn title="Tienda" items={SHOP_LINKS} />
        <FooterColumn title="Ayuda" items={HELP_LINKS} />
        <FooterColumn title="Legal" items={LEGAL_LINKS} />
      </div>

      <div className="tracking-caps-sm mt-10 flex flex-wrap gap-6 border-t border-line pt-6 text-xs uppercase text-ink-2">
        <a
          href={SOCIAL_INSTAGRAM_URL}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex min-h-11 items-center outline-none transition-colors duration-ui ease-ui hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          Instagram — @{SOCIAL_INSTAGRAM_HANDLE}
        </a>
        <a
          href={CONTACT_WHATSAPP_URL}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex min-h-11 items-center outline-none transition-colors duration-ui ease-ui hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          WhatsApp — {CONTACT_WHATSAPP_DISPLAY}
        </a>
      </div>

      <div className="mt-16 flex justify-center">
        <Wordmark className="w-[40vw] max-w-3xl" />
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  items,
}: {
  title: string;
  items: FooterLink[];
}) {
  return (
    <div>
      <h2 className="tracking-caps-sm text-xs uppercase text-ink-2">{title}</h2>
      <ul className="mt-4 flex flex-col gap-2">
        {items.map((item) => (
          <li key={item.label}>
            {item.external ? (
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
              >
                {item.label}
              </a>
            ) : (
              <Link href={item.href} className={linkClass}>
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
