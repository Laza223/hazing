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

const appUrl = process.env.NEXT_PUBLIC_APP_URL;

export const metadata: Metadata = {
  metadataBase: appUrl ? new URL(appUrl) : undefined,
  title: "Hazing",
  description: "Hazing — ropa femenina, Argentina.",
  openGraph: {
    siteName: "Hazing",
    locale: "es_AR",
    type: "website",
    images: [{ url: "/images/campaign/og.jpg", width: 1200, height: 630 }],
  },
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
