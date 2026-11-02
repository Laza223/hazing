import { Hero } from "@/components/home/hero";
import { NewIn, type NewInItem } from "@/components/home/new-in";
import { StorySplit } from "@/components/home/story-split";
import { Lookbook, type LookbookLook } from "@/components/home/lookbook";
import { EditorialStory } from "@/components/home/editorial-story";
import { CampaignBand } from "@/components/home/campaign-band";
import { getNewestProducts } from "@/lib/catalog/queries";
import { productImageUrl } from "@/lib/images";
import { getEffectivePrice, isOnSale, toNumber } from "@/lib/catalog/pricing";
import { getHomeContent } from "@/lib/home/get-home-content";

/**
 * Home: hero → nuevo → marca → lookbook → editorial → cierre.
 *
 * Textos, links e imágenes salen de `getHomeContent()` (editable en
 * `/admin/home`; sin edición, los defaults son la campaña original de
 * `public/images/campaign/`). "Nuevo" lee los últimos productos del catálogo y
 * muestra solo los que tienen foto: sin productos con foto, la sección no
 * aparece.
 */

/** Tiles de "Nuevo": una fila de 4 en desktop, dos de 2 en mobile. */
const NEW_IN_COUNT = 4;
/** Se piden más de los que se muestran porque se descartan los que no tienen foto. */
const NEW_IN_FETCH = 12;

// Sin ISR: el layout del storefront lee la cookie del carrito, así que todas
// sus rutas son dinámicas y un `revalidate` acá no tendría efecto (medido en
// `pnpm build`, docs/spec/06-storefront.md §3.9).

export default async function HomePage() {
  const [content, newestProducts] = await Promise.all([
    getHomeContent(),
    getNewestProducts(NEW_IN_FETCH),
  ]);
  const { hero, newIn, story, lookbook, editorial, campaignBand } = content;
  const url = (path: string) => productImageUrl(path) ?? "";
  const lookbookLooks: LookbookLook[] = lookbook.looks.map((look, i) => {
    const number = String(i + 1).padStart(2, "0");
    return {
      id: `lookbook-${number}`,
      number,
      name: look.name,
      imageSrc: url(look.image),
      imageAlt: look.alt,
    };
  });
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
      <Hero
        eyebrow={hero.eyebrow}
        statement={hero.statement}
        ctaLabel={hero.ctaLabel}
        ctaHref={hero.ctaHref}
        imageSrc={url(hero.imageDesktop)}
        imageSrcMobile={url(hero.imageMobile)}
      />
      <NewIn
        items={newInItems}
        title={newIn.title}
        allHref={newIn.linkHref}
        allLabel={newIn.linkLabel}
      />
      <StorySplit
        eyebrow={story.eyebrow}
        title={story.title}
        body={story.body}
        href={story.href}
        linkLabel={story.linkLabel}
        imageSrc={url(story.image)}
        imageAlt={story.alt}
      />
      <Lookbook looks={lookbookLooks} />
      <EditorialStory
        eyebrow={editorial.eyebrow}
        title={editorial.title}
        body={editorial.body}
        href={editorial.href}
        linkLabel={editorial.linkLabel}
        images={[
          { src: url(editorial.images[0].image), alt: editorial.images[0].alt },
          { src: url(editorial.images[1].image), alt: editorial.images[1].alt },
        ]}
      />
      <CampaignBand
        eyebrow={campaignBand.eyebrow}
        title={campaignBand.title}
        href={campaignBand.href}
        linkLabel={campaignBand.linkLabel}
        imageSrc={url(campaignBand.image)}
        imageAlt={campaignBand.alt}
      />
    </>
  );
}
