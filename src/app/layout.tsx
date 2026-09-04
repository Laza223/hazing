import type { Metadata } from "next";
import { Inter, Archivo } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

// Variable (no pesos fijos) para habilitar el eje de ancho `wdth` — Display XL
// del brief usa wdth 100-112 (docs/spec/05-direccion-arte.md §3.1). Confirmado
// por spike (docs/decisions/0003-motion-y-3d.md): `weight` fijo + `axes` no
// compila en next/font — hay que declarar `weight: "variable"`.
const archivo = Archivo({
  subsets: ["latin"],
  weight: "variable",
  axes: ["wdth"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Hazing",
  description: "Hazing — ropa femenina, Argentina.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-AR" className={`${inter.variable} ${archivo.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
