import type { Metadata } from "next";
import { NuevaContrasenaForm } from "./nueva-contrasena-form";

export const metadata: Metadata = { title: "Nueva contraseña" };

export default function NuevaContrasenaPage() {
  return (
    <section className="mx-auto max-w-[1600px] px-4 py-10 md:px-10">
      <h1 className="mb-8 text-center font-display text-2xl text-ink">
        Elegí tu nueva contraseña
      </h1>
      <NuevaContrasenaForm />
    </section>
  );
}
