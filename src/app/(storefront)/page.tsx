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
import { getNewestProducts } from "@/lib/catalog/queries";
import { productImageUrl } from "@/lib/images";
import { getEffectivePrice, isOnSale, toNumber } from "@/lib/catalog/pricing";

/**
 * Home coreografiada — sub-fase 5.2 (docs/spec/05-direccion-arte.md §4, los
 * 8 beats). La entrada de marca (beat 1) y el header/footer del shell los
 * pone `(storefront)/layout.tsx` (5.1b) — acá van solo los beats 2, 3, 4, 5,
 * 6 y 7.
 *
 * NEW IN (beat 4) pasa a leer `getNewestProducts()` en la sub-fase 6.2 (ver
 * docs/spec/06-storefront.md §3.9). El resto de las secciones (hero,
 * momento 3D, lookbook, editorial) sigue con el mock mínimo: no hay ni un
 * solo asset A2/A2b/A3/A4 de producción todavía (§12, "no hay producción de
 * campaña"), así que cada una renderiza sus slots reales — es el estado
 * correcto hasta que existan esos assets, no un bug de esta página.
 */
const FEATURED_KEY_IMAGE_SRC: string | undefined = undefined;

/** Cantidad de tiles de NEW IN — igual al mock que reemplaza (ver new-in.tsx). */
const NEW_IN_COUNT = 4;

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

// Sin ISR: el layout del storefront lee la cookie del carrito, así que todas
// sus rutas son dinámicas y un `revalidate` acá no tendría efecto (medido en
// `pnpm build`, docs/spec/06-storefront.md §3.9).

export default async function HomePage() {
  const newestProducts = await getNewestProducts(NEW_IN_COUNT);
  const newInItems: NewInItem[] = newestProducts.map((product) => {
    const onSale = isOnSale(product);
    return {
      id: product.id,
      href: `/producto/${product.slug}`,
      name: product.name,
      price: getEffectivePrice(product),
      compareAtPrice: onSale ? toNumber(product.compareAtPrice) : undefined,
      imageSrc: productImageUrl(product.images[0]),
      imageSrcHover: productImageUrl(product.images[1]),
      imageAlt: product.name,
    };
  });

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
      <NewInFlightTarget items={newInItems} />
      {/* Beat 5 — momento inmersivo "La etiqueta" (sub-fase 5.3, ya cerrada) */}
      <SignatureMoment />
      {/* Beat 6 */}
      <Lookbook looks={LOOKBOOK_LOOKS} />
      {/* Beat 7 */}
      <EditorialStory looks={EDITORIAL_LOOKS} />
    </HomeSequenceProvider>
  );
}
