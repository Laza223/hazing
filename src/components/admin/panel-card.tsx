import type { LucideIcon } from "lucide-react";

/** Título de sección del panel: ícono Lucide + texto. */
export function SectionTitle({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <h2 className="flex items-center gap-2 text-base font-medium text-ink">
      <Icon className="size-[18px] text-ink-3" aria-hidden />
      {children}
    </h2>
  );
}

/** Card con encabezado (`SectionTitle`) y cuerpo libre. Sin sombra, borde `line`. */
export function PanelCard({
  icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-control border border-line bg-paper">
      <header className="border-b border-line px-5 py-3.5">
        <SectionTitle icon={icon}>{title}</SectionTitle>
      </header>
      {children}
    </section>
  );
}
