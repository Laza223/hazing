import { Hero } from "@/components/home/hero";
import { HeroToCommerce } from "@/components/home/hero-to-commerce";
import { NewInFlightTarget } from "@/components/home/new-in-flight-target";
import type { NewInItem } from "@/components/home/new-in";
import { SignatureMoment } from "@/components/immersive/signature-moment";
import { Lookbook, type LookbookLook } from "@/components/home/lookbook";
import {
  EditorialStory,
  type EditorialLook,
} from "@/components/home/editorial-story";
import { HomeSequenceProvider } from "@/components/home/home-sequence-context";

/**
 * Home coreografiada — sub-fase 5.2 (docs/spec/05-direccion-arte.md §4, los
 * 8 beats). La entrada de marca (beat 1) y el header/footer del shell los
 * pone `(storefront)/layout.tsx` (5.1b) — acá van solo los beats 2, 3, 4, 5,
 * 6 y 7.
 *
 * Sin datos reales de catálogo (Fase 6/7 no existe todavía): los arrays de
 * abajo son el mock mínimo que cada sección necesita para montarse — mismo
 * criterio de placeholder que usaba la home provisional de 5.1. Todos los
 * `imageSrc` quedan en `null` a propósito: no hay ni un solo asset A2/A2b/A3/A4
 * de producción todavía (§12, "no hay producción de campaña"), así que cada
 * sección renderiza sus slots reales — es el estado correcto de 5.2 hasta que
 * existan A2b/A3, no un bug de esta página.
 */
const FEATURED_KEY_IMAGE_SRC: string | undefined = undefined;

const NEW_IN_ITEMS: NewInItem[] = [
  {
    id: "new-in-1",
    href: "/producto/placeholder-1",
    name: "Prenda de ejemplo 1",
    price: 45000,
    imageSrc: null,
    imageAlt: "Prenda de ejemplo 1",
  },
  {
    id: "new-in-2",
    href: "/producto/placeholder-2",
    name: "Prenda de ejemplo 2",
    price: 38000,
    compareAtPrice: 52000,
    imageSrc: null,
    imageAlt: "Prenda de ejemplo 2",
  },
  {
    id: "new-in-3",
    href: "/producto/placeholder-3",
    name: "Prenda de ejemplo 3",
    price: 29900,
    imageSrc: null,
    imageAlt: "Prenda de ejemplo 3",
  },
  {
    id: "new-in-4",
    href: "/producto/placeholder-4",
    name: "Prenda de ejemplo 4",
    price: 33500,
    imageSrc: null,
    imageAlt: "Prenda de ejemplo 4",
  },
];

const LOOKBOOK_LOOKS: LookbookLook[] = Array.from(
  { length: 8 },
  (_, i): LookbookLook => ({
    id: `lookbook-${i + 1}`,
    number: String(i + 1).padStart(2, "0"),
    name: `Look de ejemplo ${i + 1}`,
    imageSrc: null,
    imageAlt: `Look de ejemplo ${i + 1}`,
  }),
);

const EDITORIAL_LOOKS: EditorialLook[] = [
  {
    id: "editorial-1",
    imageSrc: null,
    imageAlt: "Editorial de campaña, look 1",
    lookHref: "/tienda?look=1",
    tiles: [
      {
        id: "editorial-1-a",
        href: "/producto/placeholder-5",
        name: "Prenda de ejemplo 5",
        price: 41000,
        imageSrc: null,
        imageAlt: "Prenda de ejemplo 5",
      },
      {
        id: "editorial-1-b",
        href: "/producto/placeholder-6",
        name: "Prenda de ejemplo 6",
        price: 27500,
        imageSrc: null,
        imageAlt: "Prenda de ejemplo 6",
      },
    ],
  },
  {
    id: "editorial-2",
    imageSrc: null,
    imageAlt: "Editorial de campaña, look 2",
    lookHref: "/tienda?look=2",
    tiles: [
      {
        id: "editorial-2-a",
        href: "/producto/placeholder-7",
        name: "Prenda de ejemplo 7",
        price: 36000,
        imageSrc: null,
        imageAlt: "Prenda de ejemplo 7",
      },
      {
        id: "editorial-2-b",
        href: "/producto/placeholder-8",
        name: "Prenda de ejemplo 8",
        price: 48900,
        imageSrc: null,
        imageAlt: "Prenda de ejemplo 8",
      },
    ],
  },
];

export default function HomePage() {
  return (
    // El hero siempre renderiza el marco de la imagen clave (con la foto A3
    // real cuando exista, o con su slot mientras tanto), así que el beat 3
    // corre en Modo A (Flip) desde hoy: lo que vuela es el marco, no la foto.
    // Ver `flightEnabled` en home-sequence-context.tsx.
    <HomeSequenceProvider hasHeroKeyFrame>
      {/* Beat 2 */}
      <Hero keyImageSrc={FEATURED_KEY_IMAGE_SRC} />
      {/* Beat 3 */}
      <HeroToCommerce />
      {/* Beat 4 */}
      <NewInFlightTarget items={NEW_IN_ITEMS} />
      {/* Beat 5 — momento inmersivo "La etiqueta" (sub-fase 5.3, ya cerrada) */}
      <SignatureMoment />
      {/* Beat 6 */}
      <Lookbook looks={LOOKBOOK_LOOKS} />
      {/* Beat 7 */}
      <EditorialStory looks={EDITORIAL_LOOKS} />
    </HomeSequenceProvider>
  );
}
