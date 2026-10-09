import { Hero } from "@/components/home/hero";
import { NewIn, type NewInItem } from "@/components/home/new-in";
import { StorySplit } from "@/components/home/story-split";
import { Lookbook, type LookbookLook } from "@/components/home/lookbook";
import { EditorialStory } from "@/components/home/editorial-story";
import { CampaignBand } from "@/components/home/campaign-band";
import { getNewestProducts } from "@/lib/catalog/queries";
import { productImageUrl } from "@/lib/images";
import { getEffectivePrice, isOnSale, toNumber } from "@/lib/catalog/pricing";
import {
  HOME_CAMPAIGN_BAND,
  HOME_EDITORIAL,
  HOME_STORY,
} from "@/lib/content/copy";

/**
 * Home: hero → nuevo → marca → lookbook → editorial → cierre.
 *
 * Todas las fotos son de campaña, en `public/images/campaign/`. "Nuevo" lee
 * los últimos productos del catálogo y muestra solo los que tienen foto: sin
 * productos con foto, la sección no aparece.
 */
const CAMPAIGN = "/images/campaign";

const HERO_IMAGE_SRC = `${CAMPAIGN}/hero-desktop.avif`;
const HERO_IMAGE_SRC_MOBILE = `${CAMPAIGN}/hero-mobile.avif`;

/** Tiles de "Nuevo": una fila de 4 en desktop, dos de 2 en mobile. */
const NEW_IN_COUNT = 4;
/** Se piden más de los que se muestran porque se descartan los que no tienen foto. */
const NEW_IN_FETCH = 12;

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

const EDITORIAL_IMAGES = [
  {
    src: `${CAMPAIGN}/editorial-01.webp`,
    alt: "Top halter blanco con argolla dorada",
  },
  {
    src: `${CAMPAIGN}/editorial-02.webp`,
    alt: "Top animal print de tul y minifalda negra",
  },
] as const;

// Sin ISR: el layout del storefront lee la cookie del carrito, así que todas
// sus rutas son dinámicas y un `revalidate` acá no tendría efecto (medido en
// `pnpm build`, docs/spec/06-storefront.md §3.9).

export default async function HomePage() {
  const newestProducts = await getNewestProducts(NEW_IN_FETCH);
  const newInItems: NewInItem[] = newestProducts
    .filter((product) => product.images.length > 0)
    .slice(0, NEW_IN_COUNT)
    .map((product) => {
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
    <>
      <Hero imageSrc={HERO_IMAGE_SRC} imageSrcMobile={HERO_IMAGE_SRC_MOBILE} />
      <NewIn items={newInItems} />
      <StorySplit
        eyebrow={HOME_STORY.eyebrow}
        title={HOME_STORY.title}
        body={HOME_STORY.body}
        href="/tienda"
        linkLabel={HOME_STORY.linkLabel}
        imageSrc={`${CAMPAIGN}/story-01.webp`}
        imageAlt="Top strapless con estampa y jean negro"
      />
      <Lookbook looks={LOOKBOOK_LOOKS} />
      <EditorialStory
        eyebrow={HOME_EDITORIAL.eyebrow}
        title={HOME_EDITORIAL.title}
        body={HOME_EDITORIAL.body}
        href="/tienda"
        linkLabel={HOME_EDITORIAL.linkLabel}
        images={EDITORIAL_IMAGES}
      />
      <CampaignBand
        eyebrow={HOME_CAMPAIGN_BAND.eyebrow}
        title={HOME_CAMPAIGN_BAND.title}
        href="/tienda"
        linkLabel={HOME_CAMPAIGN_BAND.linkLabel}
        imageSrc={`${CAMPAIGN}/band-01.webp`}
        imageAlt="Musculosa blanca y pantalón animal print"
      />
    </>
  );
}
