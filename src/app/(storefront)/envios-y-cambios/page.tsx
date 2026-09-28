import type { Metadata } from "next";
import Link from "next/link";
import { Prose } from "@/components/legal/prose";
import { businessInfo } from "@/lib/legal/business-info";
import {
  CONTACT_WHATSAPP_DISPLAY,
  CONTACT_WHATSAPP_URL,
  EXCHANGE_POLICY,
} from "@/lib/content/copy";

export const metadata: Metadata = {
  title: "Envíos y cambios",
  description:
    "Cómo enviamos, cómo cambiar una prenda y cómo funciona el derecho de arrepentimiento en Hazing.",
};

export default function EnviosYCambiosPage() {
  return (
    <Prose>
      <h1>Envíos y cambios</h1>

      <h2>Envíos</h2>
      <ul>
        <li>Enviamos a todo el país desde Luján, Buenos Aires.</li>
        <li>
          El costo y el plazo se calculan con tu código postal antes de
          confirmar la compra.
        </li>
        <li>
          El despacho es manual y recibís novedades de tu envío por email.
        </li>
      </ul>

      <h2>Medios de pago</h2>
      <p>
        Aceptamos {businessInfo.paymentMethods}. El pago se procesa de forma
        segura con Mercado Pago; Hazing no almacena los datos de tu tarjeta.
      </p>

      <h2>Cambios de talle o color</h2>
      <ul>
        {EXCHANGE_POLICY.conditions.map((condition) => (
          <li key={condition}>{condition}</li>
        ))}
      </ul>
      <p>
        Para pedir un cambio, escribinos por{" "}
        <a href={CONTACT_WHATSAPP_URL} target="_blank" rel="noreferrer">
          WhatsApp ({CONTACT_WHATSAPP_DISPLAY})
        </a>{" "}
        o a <a href={`mailto:${businessInfo.email}`}>{businessInfo.email}</a>{" "}
        con tu número de pedido y qué querés cambiar.
      </p>

      <h2>Prendas con falla</h2>
      <p>{EXCHANGE_POLICY.defects}</p>

      <h2>Arrepentimiento: devolver una compra</h2>
      <p>
        Además de los cambios, dentro de los {businessInfo.retractionDays} días
        corridos desde que recibís tu compra podés arrepentirte y devolverla,
        sin dar explicaciones, desde el{" "}
        <Link href="/arrepentimiento">Botón de Arrepentimiento</Link> (art. 34
        de la Ley 24.240). Vale para todas las prendas, también las blancas: te
        devolvemos el total que pagaste y el envío de la devolución corre por
        nuestra cuenta. La prenda tiene que volver en las condiciones en que la
        recibiste.
      </p>
    </Prose>
  );
}
