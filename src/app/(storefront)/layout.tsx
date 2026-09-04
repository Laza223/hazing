import type { ReactNode } from "react";

import { BrandEntrance } from "@/components/layout/brand-entrance";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { MotionProvider } from "@/lib/motion/motion-provider";

/**
 * Layout del storefront (grupo de ruta) — chrome de Header/Footer/BrandEntrance
 * separado del root layout, que es compartido con el futuro admin (Fase 7).
 * Ver docs/spec/05-direccion-arte.md §13 (sub-fase 5.1).
 */
export default function StorefrontLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <MotionProvider>
      <BrandEntrance />
      <Header />
      <main>{children}</main>
      <Footer />
    </MotionProvider>
  );
}
