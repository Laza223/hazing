"use client";

import { useRef } from "react";
import Image from "next/image";

import { cn } from "@/lib/utils";
import { CtaLink } from "@/components/home/cta-link";
import { useReveal } from "@/lib/motion/use-reveal";

export interface StorySplitProps {
  eyebrow: string;
  title: string;
  body: string;
  href: string;
  linkLabel: string;
  /** Foto de campaña horizontal 3:2. */
  imageSrc: string;
  imageAlt: string;
  className?: string;
}

/**
 * Bloque de marca de la home: texto a la izquierda (4 de 12 columnas) y una
 * foto horizontal 3:2 a la derecha (7 de 12). En mobile, foto arriba y texto
 * abajo.
 */
export function StorySplit({
  eyebrow,
  title,
  body,
  href,
  linkLabel,
  imageSrc,
  imageAlt,
  className,
}: StorySplitProps) {
  const containerRef = useRef<HTMLElement>(null);
  useReveal(containerRef);

  return (
    <section
      ref={containerRef}
      id="marca"
      aria-labelledby="home-story-title"
      className={cn(
        "grid grid-cols-1 gap-8 px-4 py-16 md:px-10 md:py-24 lg:grid-cols-12 lg:items-end lg:gap-x-6",
        className,
      )}
    >
      <div
        data-reveal-item
        className="relative aspect-[3/2] overflow-hidden bg-paper-2 lg:order-2 lg:col-span-7 lg:col-start-6"
      >
        <Image
          fill
          sizes="(min-width: 1024px) 55vw, 100vw"
          src={imageSrc}
          alt={imageAlt}
          className="object-cover"
        />
      </div>

      <div data-reveal-item className="lg:order-1 lg:col-span-4">
        <p className="tracking-caps-sm text-xs uppercase text-ink-3">
          {eyebrow}
        </p>
        <h2
          id="home-story-title"
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
    </section>
  );
}
