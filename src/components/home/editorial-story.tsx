"use client";

import { useRef } from "react";
import Image from "next/image";

import { cn } from "@/lib/utils";
import { CtaLink } from "@/components/home/cta-link";
import { useReveal } from "@/lib/motion/use-reveal";

export interface EditorialImage {
  src: string;
  alt: string;
}

export interface EditorialStoryProps {
  eyebrow: string;
  title: string;
  body: string;
  href: string;
  linkLabel: string;
  /** Dos fotos de campaña 3:4: la grande a la izquierda, la chica bajo el texto. */
  images: readonly [EditorialImage, EditorialImage];
  className?: string;
}

/**
 * Editorial de la home: foto 3:4 grande en 5 de 12 columnas y, a la derecha,
 * el texto con una segunda foto 3:4 más chica debajo. En mobile se apila:
 * foto, texto, foto chica alineada a la derecha.
 *
 * Solo fotos de campaña y un link a la tienda: sin tiles de producto hasta que
 * el look esté cargado en el catálogo, para no mostrar prendas inventadas.
 */
export function EditorialStory({
  eyebrow,
  title,
  body,
  href,
  linkLabel,
  images,
  className,
}: EditorialStoryProps) {
  const containerRef = useRef<HTMLElement>(null);
  useReveal(containerRef);
  const [main, secondary] = images;

  return (
    <section
      ref={containerRef}
      aria-labelledby="home-editorial-title"
      className={cn(
        "grid grid-cols-1 gap-10 px-4 py-16 md:px-10 md:py-24 lg:grid-cols-12 lg:gap-x-6 lg:gap-y-0 lg:py-32",
        className,
      )}
    >
      <div
        data-reveal-item
        className="relative aspect-[3/4] overflow-hidden bg-paper-2 lg:col-span-5"
      >
        <Image
          fill
          sizes="(min-width: 1024px) 40vw, 100vw"
          src={main.src}
          alt={main.alt}
          className="object-cover"
        />
      </div>

      <div className="flex flex-col lg:col-span-4 lg:col-start-8 lg:pt-[10vh]">
        <div data-reveal-item>
          <p className="tracking-caps-sm text-xs uppercase text-ink-3">
            {eyebrow}
          </p>
          <h2
            id="home-editorial-title"
            className="tracking-caps-md mt-4 font-display text-[clamp(1.75rem,3vw,2.75rem)] font-medium uppercase leading-none text-ink"
          >
            {title}
          </h2>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-ink-2">
            {body}
          </p>
          <CtaLink href={href} className="mt-6">
            {linkLabel}
          </CtaLink>
        </div>

        <div
          data-reveal-item
          className="relative ml-auto mt-12 aspect-[3/4] w-3/4 overflow-hidden bg-paper-2 lg:ml-0 lg:mt-16 lg:w-4/5"
        >
          <Image
            fill
            sizes="(min-width: 1024px) 26vw, 75vw"
            src={secondary.src}
            alt={secondary.alt}
            className="object-cover"
          />
        </div>
      </div>
    </section>
  );
}
