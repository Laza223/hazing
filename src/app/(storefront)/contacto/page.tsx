import type { Metadata } from "next";
import { Mail, MessageCircle, Instagram } from "lucide-react";
import { businessInfo, PLACEHOLDER_PREFIX } from "@/lib/legal/business-info";
import {
  SOCIAL_INSTAGRAM_HANDLE,
  SOCIAL_INSTAGRAM_URL,
  CONTACT_WHATSAPP_DISPLAY,
  CONTACT_WHATSAPP_URL,
} from "@/lib/content/copy";

export const metadata: Metadata = {
  title: "Contacto",
  description:
    "Escribinos por email, WhatsApp o Instagram. Estamos para ayudarte con tu compra en Hazing.",
};

const itemClass =
  "flex min-h-11 items-center gap-3 border border-line px-3 py-3 text-ink outline-none transition-colors duration-ui ease-ui hover:bg-line-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

export default function ContactoPage() {
  const emailIsSet = !businessInfo.email.includes(PLACEHOLDER_PREFIX);

  return (
    <section className="mx-auto max-w-prose px-4 py-10 md:px-0">
      <header>
        <h1 className="font-display text-2xl text-ink">Contacto</h1>
        <p className="mt-2 text-ink-2">
          ¿Tenés una consulta sobre un producto, tu pedido o un cambio?
          Escribinos y te respondemos a la brevedad.
        </p>
      </header>

      <ul className="mt-6 space-y-3">
        {emailIsSet && (
          <li>
            <a
              href={`mailto:${businessInfo.email}`}
              className={itemClass}
              aria-label={`Escribir un email a ${businessInfo.email}`}
            >
              <Mail className="h-5 w-5 text-ink-3" aria-hidden />
              <span>{businessInfo.email}</span>
            </a>
          </li>
        )}

        <li>
          <a
            href={CONTACT_WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={itemClass}
            aria-label="Escribir por WhatsApp"
          >
            <MessageCircle className="h-5 w-5 text-ink-3" aria-hidden />
            <span>WhatsApp — {CONTACT_WHATSAPP_DISPLAY}</span>
          </a>
        </li>

        <li>
          <a
            href={SOCIAL_INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={itemClass}
            aria-label="Abrir Instagram de Hazing"
          >
            <Instagram className="h-5 w-5 text-ink-3" aria-hidden />
            <span>Instagram — @{SOCIAL_INSTAGRAM_HANDLE}</span>
          </a>
        </li>
      </ul>
    </section>
  );
}
