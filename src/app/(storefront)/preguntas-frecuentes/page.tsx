import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { EXCHANGE_POLICY } from "@/lib/content/copy";

export const metadata: Metadata = {
  title: "Preguntas frecuentes",
  description:
    "Dudas sobre envíos, pagos, talles, cambios y devoluciones en Hazing.",
};

const faqs: Array<{ q: string; a: ReactNode }> = [
  {
    q: "¿Hacen envíos a todo el país?",
    a: (
      <>
        Sí, enviamos a toda la Argentina desde Luján. Mirá cómo funciona en{" "}
        <Link href="/envios-y-cambios">Envíos y cambios</Link>.
      </>
    ),
  },
  {
    q: "¿Cómo sé qué talle pedir?",
    a: (
      <>
        Cada producto muestra el sistema de talles con el que está
        confeccionado. Mirá la{" "}
        <Link href="/guia-de-talles">Guía de talles</Link> o escribinos si tenés
        dudas antes de comprar.
      </>
    ),
  },
  {
    q: "¿Qué medios de pago aceptan?",
    a: "Pagás de forma segura con Mercado Pago: tarjetas de crédito/débito y dinero en cuenta. No guardamos los datos de tu tarjeta.",
  },
  {
    q: "¿Puedo cambiar una prenda por otro talle o color?",
    a: (
      <>
        Sí, dentro de los {EXCHANGE_POLICY.exchangeDays} días corridos desde que
        la recibís, sin uso, sin lavar y con su etiqueta. Las prendas blancas no
        tienen cambio, salvo falla. Todas las condiciones, en{" "}
        <Link href="/envios-y-cambios">Envíos y cambios</Link>.
      </>
    ),
  },
  {
    q: "¿Puedo devolver una compra?",
    a: (
      <>
        Sí. Tenés derecho de arrepentimiento por 10 días corridos desde que
        recibís el pedido (art. 34 Ley 24.240): gestionalo desde el{" "}
        <Link href="/arrepentimiento">Botón de Arrepentimiento</Link>.
      </>
    ),
  },
  {
    q: "¿El stock es real?",
    a: "Sí. Lo que ves disponible es lo que tenemos.",
  },
];

export default function FaqPage() {
  return (
    <section className="mx-auto max-w-prose px-4 py-10 md:px-0">
      <header>
        <h1 className="font-display text-2xl text-ink">Preguntas frecuentes</h1>
        <p className="mt-2 text-ink-2">
          Respuestas rápidas a las consultas más comunes.
        </p>
      </header>

      <div className="mt-6 divide-y divide-line border-t border-line">
        {faqs.map((f) => (
          <details key={f.q} className="group py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-medium text-ink outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">
              <span>{f.q}</span>
              <span
                aria-hidden
                className="text-ink-3 transition-transform duration-ui ease-ui group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <div className="mt-2 text-sm leading-relaxed text-ink-2 [&_a]:text-ink [&_a]:underline [&_a]:underline-offset-2">
              {f.a}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
