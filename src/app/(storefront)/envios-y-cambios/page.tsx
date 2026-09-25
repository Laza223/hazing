import type { Metadata } from "next";
import Link from "next/link";
import { Prose } from "@/components/legal/prose";
import { businessInfo } from "@/lib/legal/business-info";
import { SHIPPING_AND_RETURNS_COPY } from "@/lib/content/copy";

export const metadata: Metadata = {
  title: "Envíos y cambios",
  description:
    "Cómo enviamos, plazos y cómo funciona el derecho de arrepentimiento en Hazing.",
};

export default function EnviosYCambiosPage() {
  return (
    <Prose>
      <h1>Envíos y cambios</h1>

      <h2>Envíos</h2>
      {/* [BORRADOR — política de cambios pendiente de definición de la dueña,
          docs/spec/01-negocio.md decisión pendiente #8; ver también
          docs/spec/06-storefront.md §7. Texto único: no repetir la política
          en otra página con otras palabras. */}
      <p>{SHIPPING_AND_RETURNS_COPY}</p>
      <ul>
        <li>El costo se calcula en el checkout según tu código postal.</li>
        <li>El despacho es manual, desde Luján.</li>
        <li>Recibís novedades de tu envío por email.</li>
      </ul>

      <h2>Medios de pago</h2>
      <p>
        Aceptamos {businessInfo.paymentMethods}. El pago se procesa de forma
        segura con Mercado Pago; Hazing no almacena los datos de tu tarjeta.
      </p>

      <h2>Cambios y devoluciones</h2>
      <p>
        Podés ejercer el derecho de arrepentimiento dentro de los{" "}
        {businessInfo.retractionDays} días corridos desde el{" "}
        <Link href="/arrepentimiento">Botón de Arrepentimiento</Link>. Para
        cualquier consulta, escribinos por{" "}
        <Link href="/contacto">contacto</Link>.
      </p>
    </Prose>
  );
}
