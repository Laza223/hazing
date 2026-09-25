import type { Metadata } from "next";
import Link from "next/link";
import { Prose } from "@/components/legal/prose";
import { businessInfo } from "@/lib/legal/business-info";

export const metadata: Metadata = {
  title: "Términos y Condiciones",
  description: "Términos y condiciones de uso y compra en Hazing.",
};

export default function TerminosPage() {
  return (
    <Prose>
      <h1>Términos y Condiciones</h1>
      <p>
        Estos Términos y Condiciones regulan el uso del sitio y la compra de
        productos en Hazing. Al navegar o realizar un pedido, aceptás estos
        términos.
      </p>

      <h2>1. Identificación del proveedor</h2>
      <ul>
        <li>Titular: {businessInfo.legalName}</li>
        <li>CUIT/CUIL: {businessInfo.taxId}</li>
        <li>Domicilio: {businessInfo.address}</li>
        <li>Contacto: {businessInfo.email}</li>
      </ul>

      <h2>2. Objeto</h2>
      <p>
        Hazing comercializa ropa femenina al por menor con envíos a toda la
        República Argentina. Las imágenes son ilustrativas; puede haber
        variaciones de color según la pantalla.
      </p>

      <h2>3. Precios y medios de pago</h2>
      <p>
        Todos los precios se expresan en pesos argentinos (ARS) e incluyen los
        impuestos aplicables. Medios de pago: {businessInfo.paymentMethods}. El
        pago se procesa a través de Mercado Pago; Hazing no almacena datos de tu
        tarjeta.
      </p>

      <h2>4. Formación del contrato</h2>
      <p>
        El pedido queda confirmado una vez acreditado el pago. Nos reservamos el
        derecho de cancelar pedidos por falta de stock o errores evidentes de
        precio, en cuyo caso se reintegra el importe abonado.
      </p>

      <h2>5. Envíos</h2>
      <p>
        Las condiciones de envío se detallan en{" "}
        <Link href="/envios-y-cambios">Envíos y cambios</Link>.
      </p>

      <h2>6. Derecho de arrepentimiento</h2>
      <p>
        Podés revocar tu compra dentro de los {businessInfo.retractionDays} días
        corridos conforme al art. 34 de la Ley 24.240. Ejercé este derecho desde
        el <Link href="/arrepentimiento">Botón de Arrepentimiento</Link>.
      </p>

      <h2>7. Garantía legal</h2>
      <p>
        Los productos cuentan con la garantía legal prevista en la Ley 24.240 de
        Defensa del Consumidor. Ante un defecto, escribinos a{" "}
        {businessInfo.email} para gestionar el cambio o la devolución.
      </p>

      <h2>8. Propiedad intelectual</h2>
      <p>
        Los contenidos del sitio (marca, textos, imágenes) pertenecen a Hazing o
        a sus titulares y no pueden reproducirse sin autorización.
      </p>

      <h2>9. Privacidad</h2>
      <p>
        El tratamiento de tus datos personales se rige por nuestra{" "}
        <Link href="/privacidad">Política de Privacidad</Link>.
      </p>

      <h2>10. Jurisdicción</h2>
      <p>
        Ante cualquier controversia se aplica la legislación de la República
        Argentina y serán competentes los {businessInfo.jurisdiction}, sin
        perjuicio de los derechos que la normativa de consumo reconoce a la
        parte consumidora.
      </p>
    </Prose>
  );
}
