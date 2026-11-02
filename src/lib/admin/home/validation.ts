import type { HomeContentData } from "@/lib/home/content";

export type Validated<T> =
  { ok: true; value: T } | { ok: false; error: string };

export const LOOKBOOK_MIN = 3;
export const LOOKBOOK_MAX = 12;

const MAX_SHORT = 80;
const MAX_TITLE = 120;
const MAX_BODY = 400;
const MAX_ALT = 160;

/** Link interno (`/tienda`, `/#lookbook`) o externo https. Nada de `//host`, `javascript:` ni http. */
export function isValidHref(value: string): boolean {
  if (value.startsWith("/")) return !value.startsWith("//");
  return /^https:\/\/[^\s/]+\S*$/i.test(value);
}

/** Foto de campaña estática (`/images/...`) o subida al bucket (`home/<archivo>`). */
export function isValidImagePath(value: string): boolean {
  if (/\s|\.\./.test(value)) return false;
  return value.startsWith("/images/") || /^home\/[\w.-]+$/.test(value);
}

type Fail = { ok: false; error: string };

function text(
  raw: unknown,
  label: string,
  max: number,
): { ok: true; value: string } | Fail {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) return { ok: false, error: `${label}: es obligatorio.` };
  if (value.length > max)
    return { ok: false, error: `${label}: máximo ${max} caracteres.` };
  return { ok: true, value };
}

function href(raw: unknown, label: string) {
  const r = text(raw, label, 200);
  if (!r.ok) return r;
  if (!isValidHref(r.value))
    return {
      ok: false,
      error: `${label}: tiene que empezar con / (ej. /tienda) o con https://.`,
    } as Fail;
  return r;
}

function image(raw: unknown, label: string) {
  const r = text(raw, label, 200);
  if (!r.ok) return r;
  if (!isValidImagePath(r.value))
    return { ok: false, error: `${label}: imagen inválida.` } as Fail;
  return r;
}

/**
 * Validación pura de la home completa (el form manda todo el contenido). Normaliza
 * (trim) y devuelve el JSON listo para guardar. Cada error nombra la sección.
 */
export function validateHomeContent(
  input: unknown,
): Validated<HomeContentData> {
  if (typeof input !== "object" || input === null)
    return { ok: false, error: "Contenido inválido." };
  const i = input as Record<string, Record<string, unknown> | undefined>;
  const hero = i.hero ?? {};
  const newIn = i.newIn ?? {};
  const story = i.story ?? {};
  const editorial = i.editorial ?? {};
  const band = i.campaignBand ?? {};

  const heroEyebrow = text(hero.eyebrow, "Portada · línea chica", MAX_SHORT);
  const heroStatement = text(hero.statement, "Portada · frase", MAX_TITLE);
  const heroCtaLabel = text(hero.ctaLabel, "Portada · texto del botón", 40);
  const heroCtaHref = href(hero.ctaHref, "Portada · link del botón");
  const heroDesktop = image(hero.imageDesktop, "Portada · foto de escritorio");
  const heroMobile = image(hero.imageMobile, "Portada · foto de celular");

  const newTitle = text(newIn.title, "Nuevo · título", MAX_SHORT);
  const newLabel = text(newIn.linkLabel, "Nuevo · texto del link", 40);
  const newHref = href(newIn.linkHref, "Nuevo · link");

  const sEyebrow = text(story.eyebrow, "La marca · línea chica", MAX_SHORT);
  const sTitle = text(story.title, "La marca · título", MAX_TITLE);
  const sBody = text(story.body, "La marca · texto", MAX_BODY);
  const sLabel = text(story.linkLabel, "La marca · texto del link", 40);
  const sHref = href(story.href, "La marca · link");
  const sImage = image(story.image, "La marca · foto");
  const sAlt = text(story.alt, "La marca · descripción de la foto", MAX_ALT);

  const eEyebrow = text(
    editorial.eyebrow,
    "Editorial · línea chica",
    MAX_SHORT,
  );
  const eTitle = text(editorial.title, "Editorial · título", MAX_TITLE);
  const eBody = text(editorial.body, "Editorial · texto", MAX_BODY);
  const eLabel = text(editorial.linkLabel, "Editorial · texto del link", 40);
  const eHref = href(editorial.href, "Editorial · link");

  const bEyebrow = text(band.eyebrow, "Banda · línea chica", MAX_SHORT);
  const bTitle = text(band.title, "Banda · título", MAX_TITLE);
  const bLabel = text(band.linkLabel, "Banda · texto del link", 40);
  const bHref = href(band.href, "Banda · link");
  const bImage = image(band.image, "Banda · foto");
  const bAlt = text(band.alt, "Banda · descripción de la foto", MAX_ALT);

  const editorialImages = Array.isArray(editorial.images)
    ? editorial.images
    : [];
  if (editorialImages.length !== 2)
    return { ok: false, error: "Editorial: tienen que ser 2 fotos." };
  const eImages = editorialImages.map((raw, n) => {
    const r = (raw ?? {}) as Record<string, unknown>;
    return {
      image: image(r.image, `Editorial · foto ${n + 1}`),
      alt: text(r.alt, `Editorial · descripción foto ${n + 1}`, MAX_ALT),
    };
  });

  const lookbook = i.lookbook as { looks?: unknown } | undefined;
  const rawLooks = Array.isArray(lookbook?.looks) ? lookbook.looks : [];
  if (rawLooks.length < LOOKBOOK_MIN || rawLooks.length > LOOKBOOK_MAX)
    return {
      ok: false,
      error: `Lookbook: tienen que ser entre ${LOOKBOOK_MIN} y ${LOOKBOOK_MAX} looks.`,
    };
  const looks = rawLooks.map((raw, n) => {
    const r = (raw ?? {}) as Record<string, unknown>;
    return {
      image: image(r.image, `Lookbook · look ${n + 1} foto`),
      name: text(r.name, `Lookbook · look ${n + 1} nombre`, MAX_SHORT),
      alt: text(r.alt, `Lookbook · look ${n + 1} descripción`, MAX_ALT),
    };
  });

  const all = [
    heroEyebrow,
    heroStatement,
    heroCtaLabel,
    heroCtaHref,
    heroDesktop,
    heroMobile,
    newTitle,
    newLabel,
    newHref,
    sEyebrow,
    sTitle,
    sBody,
    sLabel,
    sHref,
    sImage,
    sAlt,
    eEyebrow,
    eTitle,
    eBody,
    eLabel,
    eHref,
    bEyebrow,
    bTitle,
    bLabel,
    bHref,
    bImage,
    bAlt,
    ...eImages.flatMap((x) => [x.image, x.alt]),
    ...looks.flatMap((x) => [x.image, x.name, x.alt]),
  ];
  for (const r of all) if (!r.ok) return { ok: false, error: r.error };

  // Todos validados arriba: el narrowing de `all` no se propaga, se lee con `v`.
  const v = (r: { ok: true; value: string } | Fail) =>
    (r as { ok: true; value: string }).value;

  return {
    ok: true,
    value: {
      hero: {
        eyebrow: v(heroEyebrow),
        statement: v(heroStatement),
        ctaLabel: v(heroCtaLabel),
        ctaHref: v(heroCtaHref),
        imageDesktop: v(heroDesktop),
        imageMobile: v(heroMobile),
      },
      newIn: {
        title: v(newTitle),
        linkLabel: v(newLabel),
        linkHref: v(newHref),
      },
      story: {
        eyebrow: v(sEyebrow),
        title: v(sTitle),
        body: v(sBody),
        linkLabel: v(sLabel),
        href: v(sHref),
        image: v(sImage),
        alt: v(sAlt),
      },
      lookbook: {
        looks: looks.map((l) => ({
          image: v(l.image),
          name: v(l.name),
          alt: v(l.alt),
        })),
      },
      editorial: {
        eyebrow: v(eEyebrow),
        title: v(eTitle),
        body: v(eBody),
        linkLabel: v(eLabel),
        href: v(eHref),
        images: [
          { image: v(eImages[0].image), alt: v(eImages[0].alt) },
          { image: v(eImages[1].image), alt: v(eImages[1].alt) },
        ],
      },
      campaignBand: {
        eyebrow: v(bEyebrow),
        title: v(bTitle),
        linkLabel: v(bLabel),
        href: v(bHref),
        image: v(bImage),
        alt: v(bAlt),
      },
    },
  };
}
