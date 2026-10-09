import type { Metadata } from "next";
import { Prose } from "@/components/legal/prose";
import { businessInfo } from "@/lib/legal/business-info";

export const metadata: Metadata = {
  title: "Política de Privacidad",
  description: "Cómo Hazing trata y protege tus datos personales (Ley 25.326).",
};

export default function PrivacidadPage() {
  return (
    <Prose>
      <h1>Política de Privacidad</h1>
      <p>
        En Hazing protegemos tus datos personales conforme a la Ley 25.326 de
        Protección de los Datos Personales. Esta política explica qué datos
        recolectamos, con qué fin y cuáles son tus derechos.
      </p>

      <h2>1. Responsable del tratamiento</h2>
      <ul>
        <li>Titular: {businessInfo.legalName}</li>
        <li>
          {businessInfo.taxIdLabel}: {businessInfo.taxId}
        </li>
        <li>Domicilio: {businessInfo.address}</li>
        <li>Contacto: {businessInfo.email}</li>
      </ul>

      <h2>2. Datos que recolectamos</h2>
      <ul>
        <li>Datos de contacto: nombre, email, teléfono.</li>
        <li>Datos de pedido y envío: dirección, localidad, código postal.</li>
        <li>
          Datos de navegación: páginas vistas y eventos de uso (analítica).
        </li>
      </ul>
      <p>
        No recolectamos ni almacenamos datos de tarjetas: el pago lo procesa
        Mercado Pago.
      </p>

      <h2>3. Finalidad</h2>
      <p>
        Usamos tus datos para procesar pedidos y envíos, brindar soporte y
        cumplir obligaciones legales.
      </p>

      <h2>4. Base legal y consentimiento</h2>
      <p>
        El tratamiento se basa en la ejecución del contrato de compra y, cuando
        corresponda, en tu consentimiento para comunicaciones y analítica. Podés
        retirar el consentimiento en cualquier momento.
      </p>

      <h2>5. Destinatarios</h2>
      <p>
        Compartimos datos solo con proveedores necesarios para operar: Mercado
        Pago (pagos), Correo Argentino u otro operador logístico (envíos),
        Resend (emails), Supabase y Vercel (infraestructura). No vendemos tus
        datos a terceros.
      </p>

      <h2>6. Tus derechos (ARCO)</h2>
      <p>
        Tenés derecho a acceder, rectificar, actualizar y suprimir tus datos.
        Para ejercerlos, escribinos a {businessInfo.email}. El acceso es
        gratuito a intervalos no inferiores a seis meses (art. 14, inc. 3, Ley
        25.326). El responsable debe responder el pedido de acceso dentro de los{" "}
        <strong>10 días corridos</strong> (art. 14) y la rectificación o
        supresión dentro de los <strong>5 días hábiles</strong> (art. 16).
      </p>
      <p>
        Para pedir la supresión de tus datos, escribinos a {businessInfo.email}{" "}
        con el asunto «Supresión de datos» y respondemos dentro del plazo legal
        indicado.
      </p>

      <h2>7. Conservación</h2>
      <p>
        Conservamos los datos mientras dure la relación comercial y los plazos
        legales aplicables (por ejemplo, obligaciones fiscales y contables).
      </p>

      <h2>8. Baja de comunicaciones</h2>
      <p>
        Podés darte de baja de los emails de marketing y de recordatorio de
        carrito en cualquier momento desde el enlace del correo, desde tus datos
        en tu cuenta o escribiéndonos a {businessInfo.email}.
      </p>

      <h2>9. Autoridad de control</h2>
      <p>
        La{" "}
        <a
          href="https://www.argentina.gob.ar/aaip"
          target="_blank"
          rel="noopener noreferrer"
        >
          Agencia de Acceso a la Información Pública (AAIP)
        </a>
        , órgano de control de la Ley 25.326, tiene la atribución de atender
        denuncias y reclamos respecto del incumplimiento de las normas sobre
        protección de datos personales. Para consultas sobre tus datos,
        escribinos a {businessInfo.email}.
      </p>
    </Prose>
  );
}
