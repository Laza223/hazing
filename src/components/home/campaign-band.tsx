import Image from "next/image";
import { cn } from "@/lib/utils";
import { CtaLink } from "@/components/home/cta-link";

export interface CampaignBandProps {
  eyebrow: string;
  title: string;
  href: string;
  linkLabel: string;
  /** Foto de campaña horizontal 3:2 con pared lisa arriba a la derecha. */
  imageSrc: string;
  imageAlt: string;
  className?: string;
}

/**
 * Cierre de la home: foto horizontal a sangre con el llamado a la tienda.
 * Desktop: el texto va arriba a la derecha, sobre la pared lisa de la foto.
 * Mobile: la foto se recorta a 4:5 sobre la modelo y el texto va debajo.
 */
export function CampaignBand({
  eyebrow,
  title,
  href,
  linkLabel,
  imageSrc,
  imageAlt,
  className,
}: CampaignBandProps) {
  return (
    <section
      aria-labelledby="home-band-title"
      className={cn("relative pb-16 md:pb-0", className)}
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-paper-2 md:aspect-[3/2] md:max-h-[100svh] md:w-full">
        <Image
          fill
          sizes="100vw"
          src={imageSrc}
          alt={imageAlt}
          className="object-cover"
          style={{ objectPosition: "40% 50%" }}
        />
      </div>

      <div className="px-4 pt-8 md:absolute md:right-0 md:top-0 md:w-[36%] md:px-10 md:pt-[5vw]">
        <p className="tracking-caps-sm text-xs uppercase text-ink-2">
          {eyebrow}
        </p>
        <h2
          id="home-band-title"
          className="tracking-caps-md mt-4 font-display text-[clamp(1.75rem,3.2vw,3rem)] font-medium uppercase leading-none text-ink"
        >
          {title}
        </h2>
        <CtaLink href={href} className="mt-6">
          {linkLabel}
        </CtaLink>
      </div>
    </section>
  );
}
