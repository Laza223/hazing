import type { Metadata } from "next";
import { Prose } from "@/components/legal/prose";
import { SIZE_GUIDE_COPY } from "@/lib/content/copy";

export const metadata: Metadata = {
  title: "Guía de talles",
  description: "Cómo elegir tu talle en Hazing.",
};

export default function GuiaDeTallesPage() {
  return (
    <Prose>
      <h1>Guía de talles</h1>
      {/* [BORRADOR — pendiente de definición de la dueña: política de cambios
          y tabla de medidas real. Ver src/lib/content/copy.ts. */}
      <p>{SIZE_GUIDE_COPY}</p>
    </Prose>
  );
}
