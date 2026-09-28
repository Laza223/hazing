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
 * docs/spec/06-storefront.md §3.9). Hero (A2b), imagen clave, lookbook y
 * editorial (A3) usan la primera tanda de campaña en
 * `public/images/campaign/` (2026-09-28). Los tiles de producto del
 * editorial siguen con el mock hasta que exista el catálogo real.
 */
const CAMPAIGN = "/images/campaign";

const HERO_IMAGE_SRC = `${CAMPAIGN}/hero-desktop.avif`;
const HERO_IMAGE_SRC_MOBILE = `${CAMPAIGN}/hero-mobile.avif`;
const FEATURED_KEY_IMAGE_SRC = `${CAMPAIGN}/key.webp`;
const FEATURED_KEY_IMAGE_ALT = "Top strapless negro y minifalda gris texturada";

/** Cantidad de tiles de NEW IN — igual al mock que reemplaza (ver new-in.tsx). */
const NEW_IN_COUNT = 4;

const LOOKBOOK_NAMES = [
  "Conjunto texturado chocolate",
  "Minifalda de cuero",
  "Cárdigan bordó con puntilla",
  "Musculosa animal print con encaje",
  "Top halter ciruela",
  "Body strapless rojo",
  "Top con volados y minifalda azul",
] as const;

const LOOKBOOK_LOOKS: LookbookLook[] = LOOKBOOK_NAMES.map(
  (name, i): LookbookLook => {
    const number = String(i + 1).padStart(2, "0");
    return {
      id: `lookbook-${number}`,
      number,
      name,
      imageSrc: `${CAMPAIGN}/look-${number}.webp`,
      imageAlt: name,
    };
  },
);

const EDITORIAL_LOOKS: EditorialLook[] = [
  {
    id: "editorial-1",
    imageSrc: `${CAMPAIGN}/editorial-01.webp`,
    imageAlt: "Top halter blanco con argolla dorada",
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
    imageSrc: `${CAMPAIGN}/editorial-02.webp`,
    imageAlt: "Top animal print de tul y minifalda negra",
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
      <Hero
        imageSrc={HERO_IMAGE_SRC}
        imageSrcMobile={HERO_IMAGE_SRC_MOBILE}
        keyImageSrc={FEATURED_KEY_IMAGE_SRC}
        keyImageAlt={FEATURED_KEY_IMAGE_ALT}
      />
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
