import {
  BRAND_STATEMENT,
  HERO_EYEBROW,
  HOME_CAMPAIGN_BAND,
  HOME_EDITORIAL,
  HOME_STORY,
} from "@/lib/content/copy";

/**
 * Contenido editable de la home (panel `/admin/home`). Se guarda como JSON en
 * `HomeContent.content`; lo que falte o sea inválido cae al default de acá, así
 * que una home sin editar se ve igual que antes del panel.
 *
 * Las imágenes son paths: `/images/...` (estáticas de campaña) o `home/<uuid>`
 * (subidas al bucket); `productImageUrl()` resuelve ambos.
 */

export interface HomeLook {
  image: string;
  name: string;
  alt: string;
}

export interface HomeImage {
  image: string;
  alt: string;
}

export interface HomeContentData {
  hero: {
    eyebrow: string;
    statement: string;
    ctaLabel: string;
    ctaHref: string;
    imageDesktop: string;
    imageMobile: string;
  };
  newIn: { title: string; linkLabel: string; linkHref: string };
  story: {
    eyebrow: string;
    title: string;
    body: string;
    linkLabel: string;
    href: string;
    image: string;
    alt: string;
  };
  lookbook: { looks: HomeLook[] };
  editorial: {
    eyebrow: string;
    title: string;
    body: string;
    linkLabel: string;
    href: string;
    images: [HomeImage, HomeImage];
  };
  campaignBand: {
    eyebrow: string;
    title: string;
    linkLabel: string;
    href: string;
    image: string;
    alt: string;
  };
}

export type HomeSectionKey = keyof HomeContentData;

const CAMPAIGN = "/images/campaign";

const LOOKBOOK_NAMES = [
  "Conjunto texturado chocolate",
  "Minifalda de cuero",
  "Cárdigan bordó con puntilla",
  "Musculosa animal print con encaje",
  "Top halter ciruela",
  "Body strapless rojo",
  "Top con volados y minifalda azul",
] as const;

export const DEFAULT_HOME_CONTENT: HomeContentData = {
  hero: {
    eyebrow: HERO_EYEBROW,
    statement: BRAND_STATEMENT,
    ctaLabel: "Ver la tienda",
    ctaHref: "/tienda",
    imageDesktop: `${CAMPAIGN}/hero-desktop.avif`,
    imageMobile: `${CAMPAIGN}/hero-mobile.avif`,
  },
  newIn: {
    title: "Nuevo",
    linkLabel: "Ver todo",
    linkHref: "/tienda?orden=novedades",
  },
  story: {
    eyebrow: HOME_STORY.eyebrow,
    title: HOME_STORY.title,
    body: HOME_STORY.body,
    linkLabel: HOME_STORY.linkLabel,
    href: "/tienda",
    image: `${CAMPAIGN}/story-01.webp`,
    alt: "Top strapless con estampa y jean negro",
  },
  lookbook: {
    looks: LOOKBOOK_NAMES.map((name, i) => ({
      image: `${CAMPAIGN}/look-${String(i + 1).padStart(2, "0")}.webp`,
      name,
      alt: name,
    })),
  },
  editorial: {
    eyebrow: HOME_EDITORIAL.eyebrow,
    title: HOME_EDITORIAL.title,
    body: HOME_EDITORIAL.body,
    linkLabel: HOME_EDITORIAL.linkLabel,
    href: "/tienda",
    images: [
      {
        image: `${CAMPAIGN}/editorial-01.webp`,
        alt: "Top halter blanco con argolla dorada",
      },
      {
        image: `${CAMPAIGN}/editorial-02.webp`,
        alt: "Top animal print de tul y minifalda negra",
      },
    ],
  },
  campaignBand: {
    eyebrow: HOME_CAMPAIGN_BAND.eyebrow,
    title: HOME_CAMPAIGN_BAND.title,
    linkLabel: HOME_CAMPAIGN_BAND.linkLabel,
    href: "/tienda",
    image: `${CAMPAIGN}/band-01.webp`,
    alt: "Musculosa blanca y pantalón animal print",
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Campo a campo: un string no vacío pisa al default, cualquier otra cosa no. */
function mergeStrings<T extends object>(defaults: T, stored: unknown): T {
  const out: Record<string, unknown> = { ...(defaults as object) };
  if (isRecord(stored)) {
    for (const key of Object.keys(defaults)) {
      const value = stored[key];
      if (typeof value === "string" && value.trim() !== "") out[key] = value;
    }
  }
  return out as T;
}

function mergeLooks(defaults: HomeLook[], stored: unknown): HomeLook[] {
  if (!isRecord(stored) || !Array.isArray(stored.looks)) return defaults;
  const looks = stored.looks.flatMap((raw): HomeLook[] => {
    if (!isRecord(raw)) return [];
    const { image, name, alt } = raw;
    if (typeof image !== "string" || image.trim() === "") return [];
    if (typeof name !== "string" || name.trim() === "") return [];
    return [{ image, name, alt: typeof alt === "string" && alt ? alt : name }];
  });
  return looks.length > 0 ? looks : defaults;
}

function mergeEditorial(
  defaults: HomeContentData["editorial"],
  stored: unknown,
): HomeContentData["editorial"] {
  const { images, ...texts } = defaults;
  const merged = mergeStrings(texts, stored);
  const storedImages =
    isRecord(stored) && Array.isArray(stored.images) ? stored.images : [];
  return {
    ...merged,
    images: [
      mergeStrings(images[0], storedImages[0]),
      mergeStrings(images[1], storedImages[1]),
    ],
  };
}

/** Mezcla lo guardado sobre los defaults. Nunca tira: JSON roto → defaults. */
export function mergeHomeContent(stored: unknown): HomeContentData {
  const root = isRecord(stored) ? stored : {};
  const d = DEFAULT_HOME_CONTENT;
  return {
    hero: mergeStrings(d.hero, root.hero),
    newIn: mergeStrings(d.newIn, root.newIn),
    story: mergeStrings(d.story, root.story),
    lookbook: { looks: mergeLooks(d.lookbook.looks, root.lookbook) },
    editorial: mergeEditorial(d.editorial, root.editorial),
    campaignBand: mergeStrings(d.campaignBand, root.campaignBand),
  };
}
